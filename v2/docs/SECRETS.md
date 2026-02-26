# Secrets

Ghostpaw stores credentials in a local database, loads them into the runtime transparently, and keeps their values out of the conversation that transits through LLM providers. The agent can authenticate API calls, query databases, and interact with third-party services — without actual secret values ever appearing in the model's context. Every channel (terminal, web, chat) can manage secrets. One store, multiple safe paths in, no values leaking out.

## The Problem

AI agent tools treat credentials as the user's problem. Set an environment variable. Maybe a `.env` file. The tool reads `process.env` and moves on.

This has consequences that compound with autonomy. The agent has a shell. It can run `echo $ANTHROPIC_API_KEY` and the value appears in the tool result — which transits through the LLM provider's API as part of the conversation payload. Nothing intercepts it. Nothing scrubs it. The key is now in a third party's logs.

Beyond leakage: keys get lost when terminals close. Keys get scattered across `.env`, `.bashrc`, `.zshenv`. The agent can't tell you what's configured. It can't validate what you paste. It can't warn when a key looks wrong. Credentials are invisible infrastructure that breaks silently.

There's a subtler problem that gets worse with autonomy. Without a proper credential system, an agent does what's expedient: it hardcodes keys into config files, drops them in `.env` files it creates, writes them into scripts. It's not malicious — it's solving the immediate problem with the most direct approach. The result is secret sprawl driven by the agent itself, scattering credentials across your filesystem into files you may not even know about — some of which end up committed to version control.

Every major open-source agent tool — Claude Code, Aider, Open Interpreter, and their derivatives — shares this gap. There is no output scrubbing, no persistent credential store, no agent-aware management. The user is expected to solve a security problem that the tool created by giving a model shell access.

## The Approach

Ghostpaw treats this as an engineering problem with a clear design:

**One persistent store.** Every secret lives in a single SQLite table in the agent's database. Set a key from any channel — it persists across restarts, is available to every tool, and has exactly one canonical copy.

**Environment variable indirection.** At startup, all secrets are loaded into `process.env`. The agent references credentials by *name* (`$MY_API_KEY`), never by value. The shell, the LLM client, the search provider — they all resolve the name to the actual value at the point of use, behind the scenes. The conversation only ever contains the name.

**No retrieval surface.** There is no tool, API endpoint, or command that returns a secret's actual value to the model. The operation doesn't exist. The agent can list what's configured (names and status), store new secrets, and remove old ones — but reading a value back is architecturally excluded. This also eliminates credential sprawl: the agent can't hardcode a secret into a config file or script because it never has the value to write. It can only reference keys by name, which is both the correct and the only available approach.

**Output scrubbing.** When a shell command's stdout or stderr contains a stored secret value, it is replaced with `***` before the model sees the result. This is the safety net for accidental exposure from commands like `env`, `printenv`, or misconfigured scripts.

**Instructed restraint.** The agent's system prompt explicitly prohibits echoing or revealing credentials. This is a soft boundary — prompt instructions are not enforceable — but it prevents the casual case where a model helpfully tries to confirm a value back to the user.

## Managing Secrets

### Terminal

```bash
ghostpaw secrets set ANTHROPIC_API_KEY    # masked input, never in shell history
ghostpaw secrets list                      # see what's configured
ghostpaw secrets delete TAVILY_API_KEY     # remove a key
```

Input is masked at the terminal level. Keys can also be piped from password managers or automation scripts.

### Web UI

The Settings page shows all secrets organized by category — LLM providers, search providers, custom keys. Set, update, or remove any secret through the browser. The web UI is password-protected and binds to localhost by default.

### Chat

In any chat-based channel, the agent can manage secrets through conversation. It lists what's configured (names and status only), stores keys you provide, and removes keys on request.

One caveat inherent to chat as a medium: when you *tell* the agent a secret value in a message, that value is in the conversation payload before any tool is called. It transits through the LLM provider. For sensitive credentials, the CLI and web UI are the recommended paths — those never send values to any external service.

## Security Guarantees

**By default, secret values never reach the LLM.** No tool returns them. No prompt contains them. Shell commands reference them by name; the runtime expands them. Output is scrubbed. During normal operation — the agent running tools, executing commands, authenticating requests — actual secret values stay entirely outside the conversation.

To actually extract a secret, a model would need to simultaneously ignore its instructions *and* transform the value to evade string-match scrubbing — for example, base64-encoding an environment variable or reversing it character by character. Both conditions must be met: adversarial intent *and* creative evasion. A normal `echo $KEY` is caught. An accidental `env` dump is caught. Casual mistakes are handled.

**LLMs are inherently insecure execution environments.** A model with shell access can run arbitrary commands, and no amount of prompt engineering creates a hard security boundary. Ghostpaw does not pretend otherwise. What it does is make the default path secure and require deliberate adversarial effort to break. Preventing a fundamentally compromised model from exfiltrating secrets is an alignment problem, not a tooling problem. Preventing accidental leakage during normal operation is a tooling problem — and Ghostpaw solves it.

### What's out of scope

- **Database encryption at rest.** The SQLite database is unencrypted. Encrypting it introduces a key-management bootstrapping problem without meaningful security gain on a single-user machine. If an attacker can read the database file, they own the machine.
- **Compromised host protection.** Ghostpaw runs on machines you control. The threat model is accidental exposure and key loss, not a compromised operating system. Infrastructure-level threats require infrastructure-level solutions.

## Supported Keys

**LLM Providers** — Anthropic, OpenAI, xAI. Multiple keys can coexist; which model runs is a separate configuration choice.

**Search Providers** — Brave Search, Tavily, Serper. These follow a priority cascade: the highest-priority configured provider is selected automatically and indicated clearly in every channel's display.

**Custom Secrets** — Any key-value pair. Database tokens, webhook URLs, third-party API keys. Stored the same way, with the same protections, loaded into the environment alongside built-in keys. The agent can reference them by name in any tool or shell command.

## Details

**Input cleaning.** Pasting API keys is error-prone. Ghostpaw strips surrounding whitespace and quotes, extracts values from assignment syntax (`export KEY="value"` becomes `value`), and cross-checks key prefixes — warning (never blocking) if a value looks like it belongs to a different provider.

**Alias resolution.** LLM providers have competing naming conventions (`ANTHROPIC_API_KEY` vs `API_KEY_ANTHROPIC`). Both work everywhere. Ghostpaw resolves either to a single canonical entry. No duplicates, no confusion.

**Environment sync.** Keys set outside Ghostpaw (shell exports, Docker, CI) are picked up at startup and persisted to the database automatically, so they survive restarts without manual re-entry.
