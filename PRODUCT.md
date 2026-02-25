# Ghostpaw

**Captured:** 2026-02-24

Single-file AI agent runtime. TypeScript project that compiles into one `.mjs` file. Independent, model-agnostic, OpenClaw-compatible. Zero setup, zero runtime dependencies, Node 22.5+ only.

The independent alternative — born the week OpenAI absorbed the incumbent.

`npx ghostpaw` — that's the entire setup.

---

## Context: Why Now

OpenClaw (224k+ GitHub stars, fastest-growing OSS AI project) joined OpenAI on February 15, 2026 — under three months after launch. Creator Peter Steinberger took a position at OpenAI. OpenClaw transitioned to an independent foundation with OpenAI sponsorship. The promise: MIT-licensed, model-agnostic, community-governed.

We've seen this pattern before. What typically follows:

- Platform biases toward the sponsor's models. Model independence erodes quietly.
- Best features go to the proprietary version. The OSS fork becomes second-class.
- Corporate priorities replace community speed. Bureaucracy grows.
- Developers who chose OpenClaw for independence now depend on OpenAI's goodwill.

Meanwhile, OpenClaw already had severe problems _before_ the OpenAI deal:

### Setup Nightmare

- Docker breaks constantly (missing `.env`, compose version mismatches, port conflicts)
- Old service names conflict on upgrade (restart loops on port 18789)
- `openclaw doctor --fix` resolves ~70% of reported problems — a diagnostic tool that's popular because it's constantly needed
- WhatsApp pairing flow is fragile, Google auth broken entirely in headless environments (12-24 minute silent timeouts before failing — [GitHub #9300](https://github.com/openclaw/openclaw/issues/9300))
- State files in `~/.openclaw/` corrupt silently, three name changes broke all existing tutorials
- Users report needing **weeks of customization** to get usable results

### Cost and Reliability

- Power users report $40-100+/month in API costs; runaway agent loops with no built-in budget limits can spike further
- Agents loop and repeat without heavy guardrail tuning
- Sessions reset when chats close, rapid-fire messages silently dropped
- 6.8 million tokens across 4,885 files (TypeScript, Swift, Kotlin) in the monorepo — core gateway alone is ~40k lines of TypeScript, but the full ecosystem including native apps, 34 plugin extensions, and sandboxing dwarfs that

### Security Crisis (Feb 2026)

- ClawHavoc incident: [1,184 malicious skills on ClawHub from 12 publisher accounts](https://cybersecuritynews.com/clawhavoc-poisoned-openclaws-clawhub/) (Antiy CERT), distributing Atomic Stealer (AMOS) — keyloggers, credential theft, crypto wallet exfiltration. One account uploaded 677 skills alone.
- [26% of 31,000 agent skills contain at least one security vulnerability](https://clawctl.com/blog/26-percent-agent-skills-vulnerable) (Cisco research); independent audit of top 2,890 skills found [41% vulnerable](https://www.esecurityplanet.com/threats/over-41-of-popular-openclaw-skills-found-to-contain-security-vulnerabilities/) (ClawSecure)
- Critical RCE vulnerability [CVE-2026-25253](https://github.com/openclaw/openclaw/security/advisories/GHSA-g8p2-7wf7-98mq) (CVSS 8.8): cross-origin WebSocket hijacking enabling one-click remote code execution
- [40,000+ OpenClaw instances exposed](https://openclaw.report/alerts/securityscorecard-40000-exposed-openclaw-instances) to the public internet, ~12,800 actively vulnerable to RCE (SecurityScorecard)
- ClawHub gate: GitHub account >7 days old. That's it. No code review.

### What People Switch To

- **Nanobot** — ~3,400 lines Python, runs on Raspberry Pi. Minimal but no ecosystem, Python-only.
- **Claude Code** — Anthropic's agent. Good but locked to one provider, not self-hosted.
- **Goose** — Block's Rust agent, enterprise-grade. Heavy for personal use.

The gap: **a JS/TS agent runtime that's minimal, self-hosted, model-independent, OpenClaw-compatible, and works on first try.** Nobody fills it.

---

## Core Concept

One `.mjs` file that IS the agent. CLI tool, runtime, and importable library in one artifact. Self-manages a workspace of markdown files on the host. Self-extends by writing new skill files through usage. Reads OpenClaw skill/soul format natively.

The key differentiator: **skills compound.** Every interaction can produce a new skill (procedural knowledge in a markdown file), which makes the agent permanently better at that task. Memory stores facts. Skills store procedures. Cron automates execution. Together, they form a learning system that no stateless agent — custom GPTs, Claude Projects, or any prompt-only tool — can replicate. The agent on day 100 is fundamentally more capable than on day 1.

Published as `ghostpaw` on npm. Three ways to run:

```bash
npx ghostpaw              # zero-install, works immediately
ghostpaw                  # after global install
node ghostpaw.mjs         # from the raw artifact
```

---

## Design Principles

Unix philosophy applied to AI agents: small sharp tools, plain text as the universal interface, composition via the LLM instead of pipes. Every decision below follows from this.

### The LLM Is the Shell

In Unix, the shell composes small tools into complex workflows through scripting. In Ghostpaw, the LLM composes small tools into complex workflows through reasoning. The LLM is the shell. Skills are shell scripts. Tools are commands. The conversation is the pipeline.

But it's better than pipes in one critical way: Unix pipes are linear (`A | B | C`) and brittle (hard-coded assumptions about output format). The LLM branches, retries, adapts. A skill can say "if the deploy fails, check the logs and try again" — the agent handles that fluidly. A shell script handling that is 50 lines of fragile error handling.

And worse in one critical way: every decision burns tokens. Unix pipes are nanoseconds. LLM calls are seconds and cost money. This is why the built-in tools exist — not because the agent couldn't `curl` a search engine, but because structured tools reduce the token cost of getting reliable results. Every tool is a performance optimization against the LLM's reasoning overhead.

Implications:

- **Don't build orchestration logic.** The LLM IS the orchestration logic. If you find yourself writing if/else chains in TypeScript to decide which tool to call, you're doing it wrong — that's the LLM's job.
- **Don't build multi-step workflows in code.** Write a skill that describes the steps. The LLM will execute them using the primitives.
- **Don't encode domain knowledge in tools.** A tool should be domain-agnostic. The Edit tool doesn't know about TypeScript syntax — a skill knows about TypeScript and tells the agent how to use Edit for it.

### Text Is the Universal Interface

Unix pipes bytes between processes. Ghostpaw pipes text between tools, skills, memory, and the human. Every boundary in the system is plain text:

| Boundary | Interface |
| --- | --- |
| Human ↔ Agent | Natural language |
| Agent ↔ Tools | Text params in, text result out |
| Agent ↔ Skills | Skill index in system prompt, full content read on demand |
| Agent ↔ Memory | Text with vector embeddings |
| Agent ↔ Config | JSON (human-editable text) |
| Agent ↔ Secrets | Named keys, values in env vars |

When choosing how to represent something, the answer is almost always "plain text." Not a binary format, not a custom protocol, not a typed schema. Text is debuggable, diffable, readable, and the LLM understands it natively.

Specifics: tool results are always text, even when the underlying operation returns structured data — the tool formats it for the LLM. Skills are markdown, not YAML or a custom DSL. Config is JSON because it's the simplest structured text that Node handles natively. The one exception is embedding vectors in SQLite (binary blobs) because vector math needs numbers, not strings.

### Tools Are Syscalls, Skills Are Programs

A tool provides raw capability — mechanism with no opinion about when or why to use it. A skill provides knowledge — policy about when, why, and how to use the tools. These never cross.

**A new tool is only justified when one of these is true:**

1. **Structured I/O that bash can't provide reliably.** web_search returns ranked results, not raw HTML the agent has to parse and re-parse.
2. **Secret isolation.** The secrets tool manages keys in SQLite → `process.env`. Keys never appear in the conversation. Bash alone can't enforce that boundary.
3. **In-process state that persists across calls.** The memory tool maintains vector embeddings in SQLite and does cosine similarity math. Can't be shelled out.
4. **Reliability or security that bash can't guarantee.** The delegate tool needs session management, budget tracking, and recursion prevention — all in-process kernel operations.

If none apply, write a skill. "How to deploy to Vercel" is a skill. "How to write database migrations" is a skill. "How to review pull requests" is a skill. If a human could do it by typing commands and reading files, the agent can too — it just needs instructions (a skill), not new capabilities (a tool).

**The current tool set through this lens:**

| Tool | Why it must be a tool |
| --- | --- |
| Grep, Ls, Read, Write, Edit | Filesystem primitives. Token-efficient structured output that bash + parsing can't match reliably. Grep and Ls prevent the agent from dumping entire files or shelling out for basic exploration. |
| Bash | Process execution. The `exec()` syscall — everything else can be built on top of it. |
| web_search | Structured search results from premium APIs (Brave/Tavily/Serper) or DDG fallback. Agent shouldn't burn tokens curl-scraping search engines. |
| web_fetch | HTML → clean text needs magpie-html. Not reliable via bash + regex. |
| memory | Vector embeddings in SQLite. Needs in-process math (cosine similarity with recency weighting) and persistent binary state. Auto-recalled by the agent before answering context-sensitive questions. |
| secrets | Security boundary. Keys must never enter the conversation context. |
| delegate | Sub-agent lifecycle. Needs session management, budget tracking, tool registration, recursion prevention. |
| check_run | Reads in-process delegation state from the runs table. |
| skills | Manages skill lifecycle: listing with usage-based rankings, reading, creating, updating. In-process state (usage tracking in SQLite). |

When someone proposes a new tool, run it through the checklist. "A tool for Docker operations" — that's a skill (the agent runs `docker` via Bash). "A tool for managing persistent browser sessions via CDP" — maybe a tool (needs a WebSocket connection that Bash can't maintain across invocations).

### State in SQLite, Behavior in Markdown, Code in the Kernel

Three layers, strictly separated:

- **SQLite** — all mutable state: sessions, messages, memory, runs, secrets, logs. One file. ACID guarantees. Survives crashes.
- **Markdown** — all behavior: SOUL.md (identity), `skills/` (knowledge), `agents/` (delegation profiles). Human-readable, human-editable, git-versionable. The agent can write new skills — that's how it learns.
- **Kernel** — the compiled `.mjs`: tools, agent loop, provider abstraction, session management. Immutable during operation. Changes only via rebuild.

Violations to watch for:

- Storing behavior in SQLite ("save tool configurations to the database") — behavior belongs in markdown.
- Putting state in files ("track sessions in a JSON file") — state belongs in SQLite.
- Making the kernel mutable at runtime ("hot-reload tool implementations") — the kernel is immutable. Skills handle runtime adaptation.

The one deliberate crossover: `config.json` is a file (not SQLite) because humans need to edit it with a text editor. It's loaded at startup and can be updated at runtime via the web control plane's Settings page (model switching, provider selection). Changes persist to disk immediately and take effect on the next agent loop iteration.

### One File, One Process, One Database

Deployment is `scp ghostpaw.mjs server:` + `node ghostpaw.mjs`. One process. One SQLite file. No daemon to manage, no container to orchestrate, no cluster to coordinate.

This constrains what Ghostpaw can be:

- No multi-process architecture (no worker pools, no separate API servers)
- No external database dependencies (no Redis, no Postgres)
- No build step for the user (the artifact is pre-built, skills are plain text)
- No background scheduler beyond the process itself

And enables what Ghostpaw should be:

- Starts in <1 second
- Works anywhere Node 22.5+ runs (laptop, server, Raspberry Pi, CI)
- State is one file that can be backed up with `cp ghostpaw.db ghostpaw.db.bak`
- Debugging is `sqlite3 ghostpaw.db "SELECT * FROM logs WHERE level = 'error'"` — not correlating logs across services

### Don't Go Enterprisey

The pressure points where complexity tries to sneak in:

| Temptation | Answer |
| --- | --- |
| "Add a REST API so other services can call the agent" | The library import already does this. The web control plane covers HTTP interaction for humans — programmatic access uses the library. |
| "Add role-based access control" | Single-user tool. If you need RBAC, you need a different tool. |
| "Add a configuration UI" | The web control plane's Settings page handles model switching, provider selection, and secret management. The underlying `config.json` stays a simple file humans can also edit directly. No separate config service. |
| "Support webhooks for events" | Event bus exists for library mode (in-process). Webhooks are a channel concern. |
| "Add a proper logging framework" | `INSERT INTO logs`. `SELECT * FROM logs`. Done. |
| "Add a plugin/extension API" | Skills + secrets + bash. The answer is always skills + secrets + bash. |
| "Support multiple simultaneous users" | Run multiple instances. Each gets its own workspace and database. Unix solved multi-tenancy at the process level. |

The test: **"Would this matter to a single developer running the agent on their own machine?"** If yes, consider it. If it only matters at organizational scale, skip it.

---

## Architecture

### Build Pipeline

TypeScript project → esbuild (`--format=esm`) → single `ghostpaw.mjs` file with shebang (`#!/usr/bin/env node`).

**ESM-only.** The compiled artifact and library usage are native ESM. No CJS, no interop hacks.

- Output is `.mjs` so it's unambiguously ESM regardless of where it's placed on disk.
- Dual-mode detection uses `import.meta.url` (ESM-only feature).
- esbuild handles any CJS-only build-time npm deps during bundling. Output is clean ESM.

```
src/
  index.ts                # entry point: CLI parser + library exports
  core/
    loop.ts               # agent loop (prepare → generate → tool calls → persist)
    context.ts            # system prompt assembly (SOUL + skill index + budget)
    compaction.ts         # history compaction (summarize old messages)
    session.ts            # SQLite session management, message tree
    cost.ts               # token tracking, budget enforcement
    memory.ts             # vector search + retrieval (embeddings in SQLite)
    database.ts           # SQLite wrapper, schema definition
    config.ts             # config.json loading + validation
    events.ts             # event bus for observable execution
    init.ts               # workspace scaffolding, API key setup, auto-init
    daemon.ts             # headless daemon mode
    repl.ts               # interactive terminal REPL
    runs.ts               # delegated task tracking
    secrets.ts            # secure key-value storage, env sync, validation
    agents.ts             # agent profiles (markdown in agents/)
    service.ts            # OS service install (systemd, launchd, cron)
    soul.ts               # default SOUL.md content
    default_souls.ts      # built-in soul templates for specialized sub-agents (e.g. JS Engineer)
    default_skills.ts     # bundled starter skills
    stream_format.ts      # streaming output formatting
    scout.ts              # training pipeline: scout phase (friction mining)
    absorb.ts             # training pipeline: absorb phase (knowledge extraction)
    reflect.ts            # training pipeline: reflect phase (skill generation)
  tools/
    registry.ts           # tool registration/management
    grep.ts               # Grep tool (structured pattern search, rg with POSIX grep fallback)
    ls.ts                 # Ls tool (structured directory listing, pure Node.js)
    read.ts               # Read tool (line ranges, maxChars truncation, binary detection)
    write.ts              # Write tool (with LLM content sanitization)
    edit.ts               # Edit tool (search-and-replace, batch, insert-at-line, replace-all)
    bash.ts               # Bash tool (shell execution, secret scrubbing)
    delegate.ts           # sub-agent delegation (foreground/background)
    check_run.ts          # poll background task status
    memory.ts             # memory operations (remember/recall/forget)
    skills.ts             # skill management (list/read/create/update)
    search.ts             # web search (Brave/Tavily/Serper/DDG cascade)
    web.ts                # URL → readable content
    secrets.ts            # secret management tool
    mcp.ts                # MCP client tool (discover/call, stdio + HTTP transport)
    train.ts              # training pipeline tool (absorb → refine → tidy)
    scout.ts              # scouting tool (friction mining / directed research)
  channels/
    runtime.ts            # ChannelRuntime: per-session agent loops, sticky sessions
    telegram.ts           # Telegram adapter (grammY, long-polling, read receipts)
  web/
    channel.ts            # createWebChannel() factory: HTTP server lifecycle
    auth.ts               # scrypt password hashing, HMAC-signed session tokens
    router.ts             # lightweight URL router with param extraction
    handler.ts            # request pipeline: security headers, rate limit, CSRF, auth, routing
    routes-auth.ts        # /login, /logout, /health
    routes-api.ts         # /api/* endpoints (sessions, chat SSE, skills, memory, train, scout)
    routes-static.ts      # embedded CSS/JS assets with cache-busting ETags
    templates.ts          # HTML generation (login page, app shell, custom CSS)
    client.ts             # client-side SPA JavaScript (embedded as string)
    rate-limit.ts         # per-IP rate limiting (login + general)
    body.ts               # request body parsing with size limits and timeouts
    response.ts           # json(), html(), redirect() helpers
    types.ts              # shared type definitions
    constants.ts          # configuration constants, boot ID for cache busting
    index.ts              # public API re-exports
  lib/
    embedding.ts          # character n-gram hashing (deterministic, no API needed)
    vectors.ts            # cosine similarity, top-K search
    diff.ts               # string diff/patch (for Edit tool)
    workspace.ts          # shared workspace path validation
    errors.ts             # structured error hierarchy
    ids.ts                # URL-safe random ID generation
    terminal.ts           # terminal utilities (masked input, styling)
    skill-history.ts      # skill usage tracking and ranking
  mcp/
    client.ts             # MCP client (connect, discover tools, call tools)
    jsonrpc.ts            # JSON-RPC 2.0 message construction and parsing
    transport-stdio.ts    # stdio transport (spawn child process, line-delimited JSON)
    transport-http.ts     # Streamable HTTP transport (POST + optional SSE)
    types.ts              # MCP protocol type definitions

dist/
  ghostpaw.mjs            # single compiled artifact (ESM)

package.json              # name: "ghostpaw", bin: { ghostpaw: "./dist/ghostpaw.mjs" }
```

Five bundled npm dependencies that get compiled into the single artifact:

- **chatoyant** — LLM provider abstraction. Handles all provider-specific details (auth headers, message schema translation, tool call format normalization, SSE stream parsing) behind a single `chat()` interface. Supports Anthropic, OpenAI, xAI, Google, and any OpenAI-compatible endpoint.
- **magpie-html** — HTML content extraction. Parses web pages into clean readable text for the web_fetch tool.
- **grammY** — Telegram Bot API framework. Long-polling, middleware, keyboard builders. Bundled with CJS interop via `createRequire` and native fetch aliasing to avoid `node-fetch` conflicts.
- **marked** — Markdown renderer for the web UI. Configured with XSS-safe overrides (raw HTML escaped, `javascript:` URLs blocked).
- **bootstrap** — CSS framework for the web UI. Embedded as a text string at build time via a custom esbuild plugin.

Dev dependencies (esbuild, typescript, etc.) are build-time only. All runtime deps are bundled into the output — the `.mjs` artifact needs no `node_modules`.

### Runtime: Node 22.5+ Native APIs Only

| Need            | Solution                    | Notes                                                                                             |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| Database        | `node:sqlite`               | Sessions, messages, memory, runs, secrets, logs. One file: `ghostpaw.db`.                         |
| HTTP server     | `node:http`                 | Built-in web control plane: password-authenticated UI with real-time chat, training, scouting, memory, sessions. SSE streaming. |
| LLM calls       | chatoyant (bundled)         | Provider abstraction. Handles auth, streaming, tool calls for Anthropic/OpenAI/xAI/Google.        |
| HTML extraction | magpie-html (bundled)       | Web page → clean readable text for the web_fetch tool.                                            |
| Telegram        | grammY (bundled)            | Bot API long-polling, middleware, message splitting. Runs alongside REPL or headless.             |
| Shell execution | `node:child_process`        | spawn/exec for Bash tool and process management.                                                  |
| File system     | `node:fs`                   | Read/Write/Edit tools, skill/soul loading.                                                        |
| CLI parsing     | `node:util.parseArgs`       | Built-in arg parser, no commander needed.                                                         |
| Crypto          | `node:crypto`               | Token generation, hashing.                                                                        |

### Dual-Mode Entry Point

The single file detects how it's invoked:

**As CLI** (`ghostpaw [command]`): runs the specified command or interactive REPL.

```bash
ghostpaw                          # interactive chat (default)
ghostpaw run "do the thing"       # one-shot prompt, exits when done
ghostpaw init                     # explicitly re-scaffold workspace
ghostpaw secrets                  # list/set/delete API keys
ghostpaw train                    # absorb experience → improve skills → tidy
ghostpaw scout                    # discover new skill opportunities
ghostpaw scout "docker deploys"   # directed scout with full agent run
```

Initialization is seamless: the first time any command runs, Ghostpaw detects the workspace isn't set up, scaffolds the required files (config.json, SOUL.md, directories), and — if running in a TTY — prompts for an API key. `ghostpaw init` exists for explicit re-scaffolding but is never a required first step.

**As library** (`import` from another ESM file): exports the core API.

```javascript
import { createAgent } from "ghostpaw";

const agent = await createAgent({ workspace: "./my-workspace" });
const result = await agent.run("analyze this codebase");
```

Detection: check `import.meta.url` against `process.argv[1]`. If match → CLI mode. Otherwise → library exports only, no side effects.

---

## Agent Loop

### Core Flow

1. **Context assembly** — build system prompt in this order:
   - SOUL.md (personality/behavior — the agent's identity)
   - Memory guidance (tells the agent to auto-recall relevant past context before answering)
   - Skill index from `skills/` (lightweight filename + title listing — agent reads full skills on demand)
   - Tool descriptions (structured definitions of all available tools)
   - Cost/budget notice (current token usage, remaining budget — only when approaching limit)
   - Session history from SQLite (walk the message tree from head to root, apply compaction if needed)
2. **Model call** — send assembled prompt to LLM provider via chatoyant, stream response
3. **Parse response** — extract text and/or tool calls from streamed chunks
4. **Tool execution** — if tool calls present, execute each, collect results
5. **Feed back** — append tool results to conversation, go to step 2
6. **Persist** — when model returns final text (no more tool calls), persist full exchange to SQLite, update token counters
7. **Budget check** — if session token budget exceeded, warn and stop

Runs are serialized per-session (only one agent loop per session at a time) to prevent races and keep history consistent.

### Tools

All tools are built into the kernel. No plugin system, no dynamic loading — every tool ships in the compiled artifact.

#### Primitives

The foundational 6. With these alone, the agent can do anything — the rest are conveniences.

| Tool      | Implementation             | Notes                                                                                                                                                           |
| --------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grep**  | `rg` / POSIX `grep` fallback | Search file contents by pattern. Structured results (file, line, content). Auto-detects ripgrep, falls back to POSIX grep. Token-efficient: locate before reading. |
| **Ls**    | `node:fs.readdir`          | Structured directory listing with depth control and glob filtering. Skips noise dirs (.git, node_modules). Pure Node.js, no external deps.                      |
| **Read**  | `node:fs.readFile`         | Read file contents. Supports line ranges (`startLine`/`endLine`), `maxChars` truncation, binary detection. Line-boundary-aware truncation.                      |
| **Write** | `node:fs.writeFile`        | Create or overwrite files. Creates directories as needed. Rejects empty writes to existing files. LLM output sanitization (HTML entities, literal escapes).     |
| **Edit**  | String diff/replace        | Search-and-replace (single, batch, replace-all), insert-at-line. Fuzzy whitespace fallback. Safety: no-op detection, empty file protection, size shrink warnings. |
| **Bash**  | `node:child_process.spawn` | Execute shell commands. Configurable timeout (default 120s). Returns stdout + stderr + exit code.                                                               |

#### Built-in Tools

Things that are too common or too important to leave to bash scripting. Each solves a problem that would be unreliable or insecure as a skill-driven workaround.

| Tool            | What it does                       | Why it's built in                                                                                   |
| --------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **web_search**  | Search the web (Brave/Tavily/Serper/DDG) | Structured results. Premium providers via API key, DDG as free fallback. Resolved per-invocation. |
| **web_fetch**   | URL → clean readable text          | Needs HTML parsing (magpie-html). Saves large results to disk automatically.                        |
| **memory**      | Remember/recall/forget facts       | Vector embeddings in SQLite. Similarity search with recency weighting. Auto-recalled before answering questions. |
| **secrets**     | List/set/delete API keys           | Keys live in SQLite, sync to `process.env`. Never visible in prompts or skill files.                |
| **delegate**    | Spawn a focused sub-agent          | Runs with its own context (optionally from an agent profile). Foreground or background.             |
| **check_run**   | Poll a background delegation       | Returns status/result of a previously spawned background task.                                      |
| **skills**      | List/read/create/update skills     | Manages the `skills/` directory. Rankings, usage tracking, skill authoring from conversation.        |
| **train**       | Run the full training pipeline     | Absorb → refine skills → tidy. Returns structured JSON; the agent formats the report. 10-min timeout. |
| **scout**       | Discover new skill opportunities   | Friction mining or directed research. Returns trail suggestions or a full report. 5-min timeout.    |
| **mcp**         | Discover and call external MCP tools | Native MCP client. Auto-detects HTTP vs stdio transport. Connection caching, auth via SecretStore. Server knowledge lives in skills. |

The delegate tool is the key to scaling: instead of one monolithic agent, the main agent spawns focused sub-agents for specific tasks. Each sub-agent gets a clean context with the relevant agent profile loaded, runs autonomously with the same tool set (minus delegate/check_run to prevent recursion), and returns its result. The `excludeTools` option on `createAgent()` controls which tools are omitted — used internally by train and scout to prevent their inner agents from recursively invoking themselves.

---

## LLM Providers

### Delegated to chatoyant

Provider management is handled by **chatoyant**, a lean LLM abstraction library that's bundled into the artifact at build time. This keeps provider-specific complexity (auth headers, message schema translation, tool call format normalization, SSE stream parsing) out of Ghostpaw's codebase entirely.

Chatoyant provides:

- Unified `chat()` interface across all providers
- Streaming via async generators with normalized chunk types
- Tool call/result round-trip in the provider's native format
- Automatic provider detection from model name
- Fail-fast error handling — network errors, auth errors, rate limits return immediately, never hang

Supported providers: Anthropic, OpenAI, xAI, Google, and any OpenAI-compatible endpoint.

API keys are resolved from environment variables or from Ghostpaw's secret store (which syncs into `process.env` on startup). No per-provider config blocks needed — just set the key and pick a model name.

### Model Configuration

```json
{
  "models": {
    "default": "claude-sonnet-4-6"
  },
  "costControls": {
    "maxTokensPerSession": 200000,
    "maxTokensPerDay": 1000000,
    "warnAtPercentage": 80
  }
}
```

One model for everything — no tiers, no complexity. Can be overridden per-session or per-delegation via the `--model` flag or delegate tool parameter. Model names follow the provider's native naming — chatoyant resolves the right provider and API format automatically.

---

## Session Management

### SQLite Schema

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  token_budget INTEGER,
  model TEXT,
  head_message_id TEXT,
  metadata TEXT
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_id TEXT REFERENCES messages(id),
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT,
  model TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_compaction INTEGER DEFAULT 0
);

CREATE TABLE memory (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  content TEXT NOT NULL,
  embedding BLOB,       -- float32 array stored as blob
  created_at INTEGER NOT NULL,
  source TEXT            -- 'conversation' | 'manual' | 'compaction' | 'absorbed'
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_session_id TEXT REFERENCES sessions(id),
  agent_profile TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed'
  prompt TEXT,
  result TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  announced INTEGER DEFAULT 0
);

CREATE TABLE secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Session Tree

Messages form a tree via `parent_id`. The session's `head_message_id` points to the current conversation tip.

- **Linear conversation:** each new message's `parent_id` = previous `head_message_id`. Then update `head_message_id` to the new message.
- **Branch:** create a new message with `parent_id` pointing to any earlier message. Update `head_message_id` to the new branch tip.
- **Rewind:** set `head_message_id` to an earlier message. Old branch stays in DB (no data loss).
- **Get conversation:** walk `parent_id` chain from `head_message_id` to root. That's the current context.

### Compaction

When conversation context approaches model's token limit:

1. Take oldest messages in the current chain (excluding the most recent N messages)
2. Call LLM to summarize them into a concise recap
3. Insert a compaction message (`is_compaction = 1`) as a new tree node
4. Re-parent the kept recent messages under the compaction node
5. The conversation chain is now: compaction summary → recent messages → head

Token counting uses the bundled approximate tokenizer (~4 chars per token). Compaction triggers automatically when assembled context exceeds the configured threshold.

---

## Skills

Skills are the core differentiator. Not a feature — the thesis.

A skill is a markdown file in `skills/` that gives the agent procedural knowledge about how to accomplish specific tasks. No code, no API, no lifecycle — just context injected into the system prompt. But the mechanism is less interesting than what it enables: **a learning system that compounds over time.**

### Why Skills Win

Three capabilities combine into something no stateless agent can replicate:

| Capability | What it stores | How it persists |
| --- | --- | --- |
| **Memory** | Facts — what happened, user preferences, outcomes | Vector embeddings in SQLite, searchable via `recall` |
| **Skills** | Procedures — how to do things, step by step | Markdown files in `skills/`, index loaded every turn, full content on demand |
| **Scheduling** | Triggers — when to run procedures autonomously | Cron jobs via bash, running `ghostpaw run` on a schedule |

The flywheel:

1. User asks agent to deploy → agent figures it out through trial and error (3-5 tool calls)
2. Agent writes a deploy skill → next time it's one-shot (1 tool call)
3. Agent notices the skill missed an edge case → improves the skill from experience
4. User asks to automate it → agent sets up a cron job
5. Now deploys run autonomously, reliably, without human prompting

Custom GPTs can't do this — no persistence, no local execution, no scheduling. Claude Projects can't do this — no tool access, no cron, no self-modification. OpenClaw can technically do this, but skills are buried under thousands of files spanning plugins, native apps, and marketplace complexity. The signal is lost in the noise.

Ghostpaw makes skills THE mechanism. There's nothing else competing for attention. Every improvement to the agent flows through skills.

### How It Works

1. Drop a `.md` file into `skills/`
2. On every agent loop iteration, a lightweight **skill index** (filename + title) is injected into the system prompt
3. The agent reads full skill files on demand using the `read` tool when they're relevant to the task
4. Multiple skills compose naturally — the agent reads whichever ones apply

This index-based approach scales: the system prompt stays lean regardless of how many skills exist, and the agent only loads the knowledge it actually needs per turn.

A skill tells the agent _how_ to use its existing tools for a specific domain. The tools provide the _capability_ (read files, run commands, call APIs, remember things); skills provide the _knowledge_ (which commands to run, what format to use, what to watch out for).

### Example

```markdown
# Deploy to Vercel

When asked to deploy, follow these steps:

1. Check for `vercel.json` in the project root. If missing, create one with sensible defaults.
2. Run `vercel --prod` using the Bash tool. The VERCEL_TOKEN is already in the environment.
3. Parse the deployment URL from stdout.
4. Verify the deployment by fetching the URL with web_fetch.
5. Report the URL and any warnings to the user.

If deployment fails with "not linked", run `vercel link` first.
```

No factory function, no parameter schema, no test harness. The LLM reads the instructions and executes them using the built-in tools. The `VERCEL_TOKEN` is in the secret store, synced to `process.env`, never visible in the prompt.

### Self-Authoring

The agent writes new skills for itself. When it figures out how to do something through trial and error, it writes a skill file into `skills/` to remember the procedure for next time. The skill is picked up on the next loop iteration automatically.

New workspaces ship with three **meta-skills** that bootstrap the flywheel: `skill-craft.md` (how to create and evolve skills during conversation), `skill-training.md` (the systematic retrospective playbook), and `skill-scout.md` (creative ideation for discovering new opportunities). Together they teach the agent when to create skills, how to structure them, and how to improve them from practice. See **Craft, Train, Scout** below for the full lifecycle.

For complex logic — API integrations, data pipelines, multi-step automation — the agent creates **executable skills**: a markdown skill paired with a companion `.mjs` script in `.ghostpaw/scripts/`. The script runs in the Node.js runtime with access to `fetch()`, the standard library, `process.env` for secrets, and optionally Ghostpaw's own library (database, memory store). The skill describes when and why; the script encodes the reliable execution path.

The agent on day 100 has a `skills/` directory full of battle-tested procedures it wrote from experience. This accumulated knowledge is plain text — human-readable, git-versionable, shareable between workspaces. You can copy one agent's skills to another and instantly transfer its expertise.

### Agent Profiles

For delegation, agent profiles in `agents/` serve the same role as skills but scoped to sub-agents. Each profile is a markdown file that defines a focused persona:

```markdown
# Code Reviewer

You are a thorough code reviewer. When given code to review:
- Check for bugs, security issues, and performance problems
- Suggest concrete improvements with code examples
- Be direct and specific, not vague
```

The delegate tool spawns a sub-agent loaded with that profile's system prompt. Profiles are discovered dynamically — drop a `.md` file in `agents/`, it's immediately available.

### Why Not a Plugin System

See **Design Principles → Tools Are Syscalls, Skills Are Programs**. Skills (markdown) + secrets (env vars) + bash (code execution) cover everything a plugin system would, with zero API surface. The dominant pattern across OpenClaw, Cursor, Claude Code, and Goose is markdown context injection — not code plugins. The difference: Ghostpaw is the only one where the agent writes its own skills and they compound.

---

## Craft, Train, Scout

Three mechanisms for skill improvement, each at a different timescale. Every new workspace ships with a bundled meta-skill for each one (`skill-craft.md`, `skill-training.md`, `skill-scout.md`) — the agent reads them on demand when the context is right.

Train and scout are registered as **agent tools** — the user can trigger them via natural language ("time to train!", "scout for Docker ideas") and the LLM routes to the right tool, or via explicit `/train` and `/scout` fast-path commands in the REPL. Both tools prevent recursion: inner agents are created with `excludeTools: ["train", "scout"]`, and the train tool has a reentrancy guard.

### Craft (in-session)

The most organic path. During normal conversation, the agent reads `skill-craft.md` and creates or improves skills as a natural side effect of solving problems. No special command — it just happens when the agent recognizes the signals:

- Trial and error (3+ tool calls to figure something out → codify the working approach)
- User corrections (capture preferences before the session ends)
- Repeated patterns (solved this twice → deserves a skill)
- Non-obvious workflows (specific flags, required ordering, environment quirks)

The craft skill also teaches structure (action-oriented titles, concrete steps naming specific tools, failure paths, verification), evolution (compare to reality, compress, add edge cases), and anti-patterns (don't speculate, don't duplicate SOUL.md, don't hardcode values). Skills are a performance cache — concrete details (names, values, preferences) are encoded directly so they're available without a memory recall round-trip. This is the transparent, always-on path — the agent improves itself simply by working.

### Train (`ghostpaw train` or natural language)

Systematic retrospective — batch-processes accumulated experience into sharper skills. Three internal phases:

1. **Absorb** — extracts learnings from unprocessed conversation sessions. Reads session transcripts, distills key facts and procedural knowledge into concise memories stored via vector embeddings. Memory inserts and session marking are wrapped in a single SQLite transaction — crash-safe, no partial state. Skips routine exchanges, only captures genuinely useful corrections, preferences, discoveries, and successful approaches.

2. **Train** — full agent run with tools (excluding train/scout to prevent recursion), guided by `skill-training.md`. Recalls absorbed memories, reviews current skills and their rankings, checks uncommitted changes (rough drafts from craft), identifies gaps, creates new skills or improves existing ones. Tracks skill changes via git (commit before/after) for diffing. Marks its own session as absorbed to prevent self-referential feedback loops.

3. **Tidy** — cleans up old absorbed sessions (>30 days) and runs `PRAGMA optimize` on the database.

Training output is structured, not streamed. The tool returns JSON with absorb/memory/tidy stats and a typed list of skill changes (created, updated, unchanged). The agent formats this into a rewarding report — leveled-up skills get prominence, unchanged skills are noted briefly, and summary stats close it out.

### Scout (`ghostpaw scout` or natural language)

Forward-looking creative ideation — discovers unexplored skill opportunities by mining accumulated context (memories, sessions, existing skills, workspace structure) for friction signals and capability gaps.

Two modes:

- **Directionless** (`ghostpaw scout` or "sniff around") — friction mining. Analyzes what the user does repeatedly, struggles with, or could benefit from. Returns 3–5 trail suggestions grounded in specific evidence from the context.
- **Directed** (`ghostpaw scout <direction>` or "scout Docker deploys") — full agent run with tools (excluding train/scout), guided by `skill-scout.md`. Researches the direction, cross-references with the user's context, and produces a trail report with concrete first steps. Ends with an invitation to craft the scouted direction into a skill.

### The full cycle

Craft handles the moment-to-moment ("I just figured this out, let me write it down"). Train handles the retrospective ("what did I learn this week that I haven't captured?"). Scout handles the forward-looking ("what am I missing that I don't even know about yet?"). Together they form a complete learning loop: scout discovers → craft captures → train refines → repeat.

---

## OpenClaw Compatibility

### What's Compatible (Drop-In)

**SOUL.md** — loaded at conversation start, injected as the personality/behavior section of the system prompt. Same file, same format, same effect.

**SKILL.md files** — loaded from `skills/` directory. A lightweight index (filename + title) is injected into the system prompt; the agent reads full skill content on demand. Same markdown format as OpenClaw — drop-in compatible.

### What's Different (By Design)

**Session storage** — OpenClaw uses JSONL files that corrupt silently. Ghostpaw uses SQLite. Same tree semantics, better reliability. Sessions are not portable between the two systems, but that's fine — nobody migrates sessions.

**Skill management** — OpenClaw uses `openclaw.json` for skill registration and `/skills install @author/skill-name` from ClawHub. Ghostpaw uses a flat `skills/` directory. Drop markdown files in, they're loaded automatically. No registry, no marketplace, no attack surface.

**MCP** — OpenClaw supports MCP via `mcporter`, an external CLI tool with a static config file. The agent shells out to `mcporter call server.tool` — adding a dependency and never truly learning MCP patterns. Ghostpaw implements MCP natively in the kernel: a single `mcp` tool with `discover` and `call` actions, supporting both Streamable HTTP and stdio transports, with authentication resolved through the existing SecretStore. No external dependencies, no config file. Server knowledge lives in skills — the agent discovers endpoints dynamically, documents what works, and improves its MCP usage over time through training. Tested against real public servers (OpenMCP, Stripe's 562-tool surface) end-to-end.

**Tool set** — OpenClaw ships 60+ tools across groups (fs, runtime, web, ui, messaging, memory, sessions, automation). Ghostpaw ships a focused set of 16 built-in tools that cover what coding agents actually use, plus native MCP for unlimited external tool access. The skipped tools (canvas, nodes, gateway management) are OpenClaw-specific infrastructure features.

**No plugin system** — OpenClaw supports JS/Python plugins, custom tool registration, and a marketplace. Ghostpaw has no plugin API. Skills (markdown) are the extension mechanism. The agent can write and execute code via Bash when needed.

### What's Skipped (And Why)

| OpenClaw Feature           | Why Skip                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas / A2UI              | Mobile node rendering. Niche. Not core agent functionality.                                                                                                  |
| Node pairing (iOS/Android) | Mobile companion app ecosystem. Not what coding agents need.                                                                                                 |
| Docker sandboxing          | Optional in OpenClaw (most users run `sandbox: "off"`). Security via secret isolation, output scrubbing, and delegation circuit breakers instead.             |
| ClawHub marketplace        | Actively harmful (1,184 malicious skills). Local-only skills is a feature, not a limitation.                                                                 |
| macOS menu bar app         | UI wrapper. The built-in web control plane covers browser-based interaction from any device.                                                                   |
| Multi-agent routing        | Complex orchestration layer. The delegate tool covers the core use case. Full routing not day-1.                                                             |
| Browser tool (Playwright)  | Heavyweight dependency. Agent can drive Chrome via CDP through Bash + a skill, as Armin Ronacher demonstrated.                                               |
| JS/Python plugin system    | Over-engineering. Skills (markdown) + secrets (env vars) + bash (code execution) cover the same ground with zero API surface.                                |

---

## Channels

Channels are persistent messaging integrations that run alongside the interactive REPL or as a headless daemon. Each channel maintains its own sticky sessions with full conversation history, isolated from the terminal and from each other. A `ChannelRuntime` abstraction manages per-session agent loops and tool registries — channels just translate between their protocol and the runtime.

### CLI Interactive Mode

REPL in the terminal. `process.stdin` / `process.stdout`. No channel adapter needed. The simplest possible interface.

### Telegram (Implemented)

Bot API via long-polling using grammY. Create bot via @BotFather → store token with `ghostpaw secrets set TELEGRAM_BOT_TOKEN` → start Ghostpaw. The bot connects automatically at startup and shows in the REPL banner.

Features:

- **Sticky sessions** — each Telegram chat gets a persistent session keyed by chat ID. Survives restarts.
- **Typing indicators** — the bot shows "typing..." while the LLM works.
- **Message splitting** — long responses are split at paragraph boundaries (Telegram's 4096-char limit).
- **Read receipts** — reactions: 👀 (received), 👍 (responded), 👎 (error).
- **Offline catch-up** — messages sent while the bot was down are delivered by Telegram on reconnect and processed in order.
- **Access control** — optional `allowedChatIds` whitelist.
- **One-shot notifications** — `sendTelegramNotification()` sends messages without starting the full polling channel. Optionally records the message in the session's chat history for continuity.

### Web Control Plane (Implemented)

Built-in browser UI via `node:http`. Set `WEB_UI_PASSWORD` → start Ghostpaw → open `localhost:3000`. The entire interface — Bootstrap CSS, marked.js, client JS, custom styles — is embedded in the `.mjs` artifact as string constants. No static files on disk, no CDN, no asset pipeline.

Features:

- **Real-time chat** — SSE-streamed conversations with markdown rendering, code copy buttons, persistent web sessions.
- **Training** — one-click training with live phase progress indicators, skill change cards, summary stats.
- **Scouting** — friction mining for trail suggestions, deep research reports, one-click "Craft This Skill" handoff to the agent.
- **Memory** — semantic search with relevance bars, source filtering, timeline grouping.
- **Sessions** — all conversations across all channels, grouped by channel type, with inline transcript expansion.
- **Skills** — rank visualization, descriptions, inline editing.
- **Settings** — live model/provider switching (with live model lists from provider APIs), secret management (create, update, delete API keys), grouped by provider with active status.
- **Dashboard** — at-a-glance agent stats.

Security: `scrypt`-hashed password, HMAC-signed `HttpOnly`/`SameSite=Strict` cookies, CSP with per-request nonces, CSRF origin validation, rate limiting (login + general), body size/timeout limits, HSTS for non-localhost. Full security header suite.

Mobile-first responsive design with off-canvas drawer navigation and safe-area handling. ~25 modules in `src/web/` with colocated test suites.

### Planned Channels

- **Discord** — guild-based channel with role-aware access control. Same sticky-session model.

Each channel follows the same adapter pattern: receive message → channel runtime → agent loop → send response. No architectural changes required to add new channels.

---

## Security Model

- **No marketplace** — skills are local markdown files you control and audit. No download-and-execute from strangers.
- **File system boundaries** — Write tool enforces workspace-only access. Paths resolving outside the workspace are rejected.
- **Secret isolation** — API keys stored in SQLite, synced to `process.env` at startup. Never injected into the system prompt, never visible to the LLM. Input validation catches common mistakes (wrong-provider keys, shell assignment syntax, quoted values).
- **Secret scrubbing** — bash tool output (stdout/stderr) is scrubbed for known API key values before returning to the LLM conversation.
- **Cost guardrails** — token budgets per session and per day. Hard stops, not just warnings.
- **Delegation circuit breaker** — sub-agents cannot delegate further. No runaway recursion.
- **Channel isolation** — channels only connect in interactive/daemon mode. Autonomous runs (cron, library) never open protocol connections unless explicitly sending a one-shot notification.
- **Session serialization** — only one agent loop per session at a time. No race conditions on shared state.

---

## Workspace

Created automatically on first run — no separate `init` command needed. Ghostpaw detects missing workspace files, scaffolds them, and prompts for an API key (in TTY mode). Subsequent runs skip the setup entirely.

```
~/.ghostpaw/  (or wherever you run ghostpaw from — cwd IS the workspace)
  config.json             # models, cost controls
  ghostpaw.db             # SQLite: sessions, messages, memory, runs, secrets, logs
  SOUL.md                 # personality/behavior (default provided, user customizes)
  agents/                 # agent profile .md files (for delegation)
  skills/                 # SKILL.md files (OpenClaw-compatible, index in prompt, read on demand)
  .ghostpaw/              # runtime files (cached web content, skill-history git repo, executable scripts)
```

The agent operates in whatever directory you run it from — cwd IS the workspace. Sessions are scoped by cwd path.

All state in SQLite. All behavior in markdown files. Clean separation: the compiled `ghostpaw.mjs` is immutable kernel, everything in the workspace is mutable userland.

---

## Risk Assessment

| Risk                                 | Severity | Mitigation                                                                                                                                                         |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider APIs change, adapters break | Low      | Delegated to chatoyant — provider-specific changes are upstream dependency updates, not Ghostpaw patches. Chatoyant is small and actively maintained.               |
| Single file becomes limiting         | Low      | The file is the kernel. All domain complexity lives in userland skills (markdown). The agent writes its own skills and scripts as needed.                           |
| OpenClaw fixes their problems        | Very Low | Just got acquired by OpenAI — trajectory is corporate lock-in, not simplicity. Independence-minded users are leaving.                                              |
| `node:sqlite` experimental bugs      | Low      | SQLite itself is the most battle-tested DB on earth. Node binding is thin. Actively stabilizing toward stable.                                                     |
| Agents reliably building software    | Medium   | The actual hard problem — prompt engineering + tool quality, not architecture. OpenClaw community's months of skill/prompt iteration available to copy and modify.  |

---

## Benefits

### vs OpenClaw

- **Independent** — no corporate sponsor, no model bias, no vendor lock-in. Ghostpaw answers to its users, not OpenAI's foundation board.
- **Zero setup** — `npx ghostpaw` vs hours of broken configuration flows
- **Zero dependencies** — no npm install, no Docker, no daemon, no pairing wizards
- **Single artifact** — one `.mjs` file. Version it, pin it, `scp` it to any machine with Node.
- **Model-agnostic** — Anthropic, OpenAI, xAI, Google treated equally. No platform favoritism.
- **Actually reliable** — tiny surface area (tools + SQLite + one process) vs a 4,885-file monorepo of interdependent complexity
- **Secure by default** — no marketplace, no community upload, no malware vector. Skills are local files you control and audit.
- **Cost-controlled** — token budgets per session and per day, hard limits. No runaway loops burning uncapped API credits.
- **Ecosystem compatible** — reads OpenClaw SKILL.md/SOUL.md format. Community skills for free, corporate baggage stays behind.
- **Skills as primary mechanism** — OpenClaw has skills but buries them under plugins, marketplace, and MCP. Ghostpaw makes skills the only extension path — focused, auditable, self-authoring.

### vs Custom GPTs / Claude Projects / Stateless Agents

- **Persistent memory with auto-recall** — facts survive across sessions via vector embeddings in SQLite. The agent recalls relevant memories automatically before answering — no explicit prompting needed. Custom GPTs forget everything between conversations.
- **Self-authoring skills** — the agent writes and improves its own procedural knowledge. GPTs have static system prompts that only humans can edit.
- **Local execution** — bash, filesystem, code execution on your machine. GPTs run in a sandbox with no access to your environment.
- **Multi-channel** — terminal REPL, Telegram, and a built-in web control plane with real-time chat, training, scouting, and full agent management. Talk to the same agent from your phone or browser with full conversation history. No stateless agent offers this.
- **Scheduling** — cron jobs make skills autonomous. A skill + a cron schedule = recurring intelligence. No stateless agent can do this.
- **Compounding** — the agent on day 100 has a `skills/` directory full of battle-tested procedures. The GPT on day 100 is the same as day 1.
- **Transferable expertise** — copy one agent's `skills/` directory to another workspace. Instant knowledge transfer in plain text files.

---

## Strategic Value

Not a revenue product. A **reputation engine + personal infrastructure**.

- **Personal tooling** — faster/cleaner than running OpenClaw for own agent workflows
- **Reputation** — "Ghostpaw: the independent single-file agent runtime" writes its own HN headline
- **Distribution** — GitHub stars, npm (`npx ghostpaw`), "OpenClaw alternative" search traffic, developer content — all organic
- **Force multiplier** — the agent that builds the products that generate the revenue
- **Zero cost to operate** — no hosting, no subscriptions, no operational overhead
