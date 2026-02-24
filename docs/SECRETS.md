# Secrets

Ghostpaw stores API keys in a local SQLite database, loads them at startup, and scrubs them from agent-visible output. No `.env` files, no dotfile sprawl, no keys lost when a terminal closes. One source of truth, multiple ways in, and a security surface designed for an agent that has shell access.

## Quick Start

```bash
# Set a key (masked input, never in shell history)
ghostpaw secrets set ANTHROPIC_API_KEY

# See what's configured
ghostpaw secrets

# Or pipe from a password manager
op read "op://Dev/Anthropic/api-key" | ghostpaw secrets set ANTHROPIC_API_KEY
```

That's it. The key persists across restarts, gets loaded into the runtime automatically, and the agent can use it without ever seeing the value.

## What Others Do

Most agent tools — Claude Code, Aider, OpenClaw — treat API keys as the user's problem. Set an environment variable. Maybe a `.env` file. The tool reads `process.env` and moves on.

This has predictable failure modes:

- **Key loss.** Close the terminal, lose the export. Restart the machine, forget to re-source. SSH into the VPS, realize you never persisted the key.
- **Sprawl.** `.env` in the project, `.bashrc` on the machine, `.zshenv` for good measure. Multiple copies of the same secret in plaintext across the filesystem.
- **No agent awareness.** The agent can't help you manage credentials. It doesn't know what's configured, can't validate what you paste, can't warn you when something's wrong.
- **No leak protection.** The agent has a shell. `echo $ANTHROPIC_API_KEY` returns the key in the tool result, which transits through the LLM provider. Nothing redacts it.

Ghostpaw treats secrets as a first-class subsystem because an autonomous agent that can run shell commands *must* have guardrails around credentials.

## How Keys Get In

Five ingress paths, all converging to the same SQLite table:

| Path | When | Example |
|---|---|---|
| **Interactive CLI** | Manual setup | `ghostpaw secrets set TAVILY_API_KEY` |
| **Piped stdin** | Automation / password managers | `echo $KEY \| ghostpaw secrets set ...` |
| **Init flow** | First run, guided prompt | `ghostpaw init` |
| **Environment variable** | Shell export, CI, Docker | `export ANTHROPIC_API_KEY=sk-ant-...` |
| **Agent tool** | Mid-conversation | Agent calls `secrets.set(key, value)` |

Every path runs through `cleanKeyValue` before storage:

- **Trims whitespace** — trailing newlines from copy-paste
- **Strips surrounding quotes** — `"sk-ant-..."` → `sk-ant-...`
- **Extracts from assignment syntax** — `export ANTHROPIC_API_KEY="sk-ant-..."` → `sk-ant-...`
- **Cross-checks prefixes** — warns (never blocks) if the key looks like it belongs to a different provider

Interactive CLI input is masked — characters are not echoed to the terminal.

## How Keys Flow at Runtime

```
                    ┌──────────────┐
   startup          │  ghostpaw.db │  single source of truth
                    │  (secrets)   │
                    └──────┬───────┘
                           │
                    loadIntoEnv()        DB → process.env (canonical + aliases)
                           │
                    syncProviderKeys()   process.env → DB (shell overrides persist)
                           │
              ┌────────────┼────────────┐
              │            │            │
         chatoyant    search tool   bash tool
       (reads env)  (reads env per  (scrubs output)
                     invocation)
```

**Startup sequence:** `loadIntoEnv()` populates `process.env` from the database, then `syncProviderKeys()` catches any keys set in the shell environment and writes them back to the database. After this, the database and environment are in sync.

**LLM providers** (via chatoyant) read `process.env` when creating a new Chat instance, which happens fresh on every turn. Mid-session key changes take effect immediately.

**Search providers** resolve lazily on each tool invocation — not once at agent creation. If you set a Tavily key mid-conversation, the next `web_search` call uses Tavily.

**Alias resolution.** LLM providers have two naming conventions (`ANTHROPIC_API_KEY` and `API_KEY_ANTHROPIC`). Both work everywhere. The database stores the canonical form; `loadIntoEnv` sets both in the environment.

## Security Model

What's protected, what's not, and why.

**Protected:**
- Secret values never appear in the agent's system prompt
- The `secrets` tool returns key names only — never values
- Bash tool output is scrubbed: any string matching a stored key value (8+ chars) is replaced with `***`
- The soul prompt tells the agent not to echo environment variables
- Interactive input is masked (no echo)

**Not protected (by design):**
- **Plaintext in SQLite.** The database is unencrypted. This is a deliberate tradeoff: encrypted-at-rest adds complexity and a key-management bootstrapping problem (where do you store the encryption key?) without meaningfully improving security on a single-user VPS where the threat model is remote access, not local disk forensics. If an attacker has read access to `ghostpaw.db`, they already own the machine.
- **Agent `set` transits through the LLM.** When the agent stores a key via its tool, the value passes through the conversation to the LLM provider. The tool description warns about this and recommends the CLI for sensitive keys. This is a UX tradeoff — blocking agent-side key storage would prevent self-configuration workflows.
- **Shell environment inherits keys.** Commands spawned by the bash tool inherit `process.env`, which includes API keys. Scrubbing catches output, but a sufficiently creative command could exfiltrate keys (e.g., writing to a file, then reading that file). The soul prompt discourages this, and the scrubbing catches the common case (`echo`, `env`, `printenv`), but it's not a sandbox.

**The threat model in practice:** Ghostpaw runs on machines you control. The primary threats are accidental leakage (pasting the wrong key, `echo`ing secrets) and key loss (terminal closes, VPS restarts). The secret store addresses both. It does not attempt to protect against a compromised host or a malicious model — those require infrastructure-level solutions (HSMs, vault services) that are out of scope for a developer tool.

## Provider Priority

Search providers follow a strict cascade based on which keys are configured:

```
Brave (BRAVE_API_KEY) → Tavily (TAVILY_API_KEY) → Serper (SERPER_API_KEY) → DDG (free fallback)
```

`ghostpaw secrets` shows which provider is active:

```
  LLM
    ✓ Anthropic              API_KEY_ANTHROPIC
    · OpenAI                 API_KEY_OPENAI
    · xAI                    API_KEY_XAI

  Search
    · Brave Search           BRAVE_API_KEY
    ✓ Tavily                 TAVILY_API_KEY active
    · Serper                 SERPER_API_KEY
```

LLM provider selection is determined by `config.json` model choice, not key presence. Multiple LLM keys can coexist.

## For Contributors

The implementation lives in `src/core/secrets.ts`. Key structures:

- **`KNOWN_KEYS`** — Registry of all supported keys with canonical names, aliases, labels, and categories. Adding a new provider means adding one entry here.
- **`cleanKeyValue(canonical, raw)`** — Input sanitization. Returns `{ value, warning? }`. Warning is surfaced to the user but never blocks storage.
- **`createSecretStore(db)`** — Factory returning the `SecretStore` interface. All reads/writes go through this.
- **`loadIntoEnv()` / `syncProviderKeys()`** — The bidirectional sync pair. Called at every entry point (REPL, daemon, one-shot, scout, train).

The bash scrubbing lives in `src/tools/bash.ts` — iterates `KNOWN_KEYS`, checks `process.env` for each, and replaces matches in stdout/stderr.

Tests cover validation, alias resolution, the full startup cycle, and cross-provider prefix detection. Run `npm test` — the secrets suite is ~80 tests.
