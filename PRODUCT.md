# Ghostpaw

**Captured:** 2026-02-22

Single-file AI agent runtime. TypeScript project that compiles into one `.mjs` file. Independent, model-agnostic, OpenClaw-compatible. Zero setup, zero runtime dependencies, Node 22.5+ only.

The independent alternative — right after OpenAI swallowed the incumbent.

`npx ghostpaw` — that's the entire setup.

---

## Context: Why Now

OpenClaw (217k GitHub stars, fastest-growing OSS AI project) was acquired by OpenAI on February 15, 2026 — just 82 days after launch. Creator Peter Steinberger joined OpenAI. They promise "Chrome/Chromium model" open source governance.

We've seen this movie. What happens next:

- Platform biases toward GPT models. Model independence erodes.
- Best features go to the proprietary version. OSS fork becomes second-class.
- Corporate priorities replace community speed. Bureaucracy grows.
- Developers who chose OpenClaw for independence just lost it.

Meanwhile, OpenClaw already had severe problems _before_ the acquisition:

### Setup Nightmare

- Docker breaks constantly (missing `.env`, compose version mismatches, port conflicts)
- Old service names conflict on upgrade (restart loops on port 18789)
- `openclaw doctor --fix` exists because ~70% of installs are broken out of the box
- WhatsApp pairing flow is fragile, Google auth straight up broken (20-minute silent timeouts)
- State files in `~/.openclaw/` corrupt silently, three name changes broke all existing tutorials
- Users report needing **weeks of customization** to get usable results

### Cost and Reliability

- Token burn $30-50/session common, $200+ from runaway processes — no built-in cost controls
- Agents loop and repeat without heavy guardrail tuning
- Sessions reset when chats close, rapid-fire messages silently dropped
- 430,000+ lines of code across Gateway + Pi + channels + plugins + sandboxing

### Security Crisis (Feb 2026)

- ClawHavoc incident: 1,184 malicious skills on ClawHub from 12 attacker accounts
- The #1 ranked community skill was literal malware (Atomic Stealer)
- 26% of top 31,000 skills contain vulnerabilities (Cisco research)
- Critical RCE vulnerability (CVE-2026-25253), 17,903+ exposed instances
- ClawHub gate: GitHub account >7 days old. That's it. No review.

### What People Switch To

- **Nanobot** — 4k lines Python, runs on Raspberry Pi. Minimal but no ecosystem, Python-only.
- **Claude Code** — Anthropic's agent. Good but locked to one provider, not self-hosted.
- **Goose** — Block's Rust agent, enterprise-grade. Heavy for personal use.

The gap: **a JS/TS agent runtime that's minimal, self-hosted, model-independent, OpenClaw-compatible, and works on first try.** Nobody fills it.

---

## Core Concept

One `.mjs` file that IS the agent. CLI tool, runtime, and importable library in one artifact. Self-manages a workspace of markdown files on the host. Self-extends by writing new skill files through usage. Reads OpenClaw skill/soul format natively.

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
| Agent ↔ Skills | Markdown injected into system prompt |
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
| Read, Write, Edit | Filesystem primitives. Can't be composed from anything simpler. |
| Bash | Process execution. The `exec()` syscall — everything else can be built on top of it. |
| web_search | Structured search results. Agent shouldn't burn tokens curl-scraping and parsing search engine HTML. |
| web_fetch | HTML → clean text needs magpie-html. Not reliable via bash + regex. |
| memory | Vector embeddings in SQLite. Needs in-process math (cosine similarity) and persistent binary state. |
| secrets | Security boundary. Keys must never enter the conversation context. |
| delegate | Sub-agent lifecycle. Needs session management, budget tracking, tool registration, recursion prevention. |
| check_run | Reads in-process delegation state from the runs table. |

When someone proposes tool #11, run it through the checklist. "A tool for Docker operations" — that's a skill (the agent runs `docker` via Bash). "A tool for managing persistent browser sessions via CDP" — maybe a tool (needs a WebSocket connection that Bash can't maintain across invocations).

### State in SQLite, Behavior in Markdown, Code in the Kernel

Three layers, strictly separated:

- **SQLite** — all mutable state: sessions, messages, memory, runs, secrets, logs. One file. ACID guarantees. Survives crashes.
- **Markdown** — all behavior: SOUL.md (identity), `skills/` (knowledge), `agents/` (delegation profiles). Human-readable, human-editable, git-versionable. The agent can write new skills — that's how it learns.
- **Kernel** — the compiled `.mjs`: tools, agent loop, provider abstraction, session management. Immutable during operation. Changes only via rebuild.

Violations to watch for:

- Storing behavior in SQLite ("save tool configurations to the database") — behavior belongs in markdown.
- Putting state in files ("track sessions in a JSON file") — state belongs in SQLite.
- Making the kernel mutable at runtime ("hot-reload tool implementations") — the kernel is immutable. Skills handle runtime adaptation.

The one deliberate crossover: `config.json` is a file (not SQLite) because humans need to edit it with a text editor. It's read once at startup and doesn't change during operation.

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
| "Add a REST API so other services can call the agent" | The library import already does this. If HTTP is needed, it's a channel (like Telegram), not core architecture. |
| "Add role-based access control" | Single-user tool. If you need RBAC, you need a different tool. |
| "Add a configuration UI" | config.json is 10 lines. A skill can guide the user through editing it. |
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
    context.ts            # system prompt assembly (SOUL + skills + budget)
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
    secrets.ts            # secure key-value storage, env sync
    agents.ts             # agent profiles (markdown in agents/)
    service.ts            # OS service install (systemd, launchd, cron)
    soul.ts               # default SOUL.md content
    stream_format.ts      # streaming output formatting
  tools/
    registry.ts           # tool registration/management
    read.ts               # Read tool
    write.ts              # Write tool
    edit.ts               # Edit tool (find-and-replace with fuzzy fallback)
    bash.ts               # Bash tool (shell execution)
    delegate.ts           # sub-agent delegation (foreground/background)
    check_run.ts          # poll background task status
    memory.ts             # memory operations (remember/recall/forget)
    search.ts             # web search (DuckDuckGo)
    web.ts                # URL → readable content
    secrets.ts            # secret management tool
  channels/
    telegram.ts           # Telegram Bot API long-polling adapter
  ui/
    server.ts             # node:http server, SSE for streaming
    app.html              # SPA inlined as string at build time
  lib/
    embedding.ts          # character n-gram hashing (deterministic, no API needed)
    vectors.ts            # cosine similarity, top-K search
    diff.ts               # string diff/patch (for Edit tool)
    errors.ts             # structured error hierarchy
    ids.ts                # URL-safe random ID generation

dist/
  ghostpaw.mjs            # single compiled artifact (ESM)

package.json              # name: "ghostpaw", bin: { ghostpaw: "./dist/ghostpaw.mjs" }
```

Two bundled npm dependencies that get compiled into the single artifact:

- **chatoyant** — LLM provider abstraction. Handles all provider-specific details (auth headers, message schema translation, tool call format normalization, SSE stream parsing) behind a single `chat()` interface. Supports Anthropic, OpenAI, xAI, Google, and any OpenAI-compatible endpoint.
- **magpie-html** — HTML content extraction. Parses web pages into clean readable text for the web_fetch tool.

Dev dependencies (esbuild, typescript, etc.) are build-time only. The two runtime deps are bundled into the output — the `.mjs` artifact needs no `node_modules`.

### Runtime: Node 22.5+ Native APIs Only

| Need            | Solution                    | Notes                                                                                             |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| Database        | `node:sqlite`               | Sessions, messages, memory, runs, secrets, logs. One file: `ghostpaw.db`.                         |
| HTTP server     | `node:http`                 | Control UI, REST API, Server-Sent Events for response streaming.                                  |
| LLM calls       | chatoyant (bundled)         | Provider abstraction. Handles auth, streaming, tool calls for Anthropic/OpenAI/xAI/Google.        |
| HTML extraction | magpie-html (bundled)       | Web page → clean readable text for the web_fetch tool.                                            |
| Shell execution | `node:child_process`        | spawn/exec for Bash tool and process management.                                                  |
| File system     | `node:fs`                   | Read/Write/Edit tools, skill/soul loading.                                                        |
| CLI parsing     | `node:util.parseArgs`       | Built-in arg parser, no commander needed.                                                         |
| Crypto          | `node:crypto`               | Token generation, hashing.                                                                        |

### Dual-Mode Entry Point

The single file detects how it's invoked:

**As CLI** (`ghostpaw [command]`): runs the specified command or interactive REPL.

```bash
ghostpaw                          # interactive chat (default)
ghostpaw serve                    # web UI + API on localhost
ghostpaw run "do the thing"       # one-shot prompt, exits when done
ghostpaw init                     # explicitly re-scaffold workspace
ghostpaw telegram                 # start Telegram bot long-polling
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
   - SKILL.md files from `skills/` (capability context — what the agent knows how to do)
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

The foundational 4. With these alone, the agent can do anything — the rest are conveniences.

| Tool      | Implementation             | Notes                                                                                                                                                           |
| --------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read**  | `node:fs.readFile`         | Read file contents. Supports line ranges.                                                                                                                       |
| **Write** | `node:fs.writeFile`        | Create or overwrite files. Creates directories as needed.                                                                                                       |
| **Edit**  | String diff/replace        | Find unique string in file, replace with new string. The critical tool — must be rock-solid. Uses bundled diff logic for fuzzy matching when exact match fails. |
| **Bash**  | `node:child_process.spawn` | Execute shell commands. Configurable timeout (default 120s). Returns stdout + stderr + exit code.                                                               |

#### Built-in Tools

Things that are too common or too important to leave to bash scripting. Each solves a problem that would be unreliable or insecure as a skill-driven workaround.

| Tool            | What it does                       | Why it's built in                                                                                   |
| --------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **web_search**  | Search the web (DuckDuckGo)        | Structured results. Agent shouldn't be curl-scraping search engines.                                |
| **web_fetch**   | URL → clean readable text          | Needs HTML parsing (magpie-html). Saves large results to disk automatically.                        |
| **memory**      | Remember/recall/forget facts       | Vector embeddings in SQLite. Semantic search via cosine similarity. Persists across sessions.        |
| **secrets**     | List/set/delete API keys           | Keys live in SQLite, sync to `process.env`. Never visible in prompts or skill files.                |
| **delegate**    | Spawn a focused sub-agent          | Runs with its own context (optionally from an agent profile). Foreground or background.             |
| **check_run**   | Poll a background delegation       | Returns status/result of a previously spawned background task.                                      |

The delegate tool is the key to scaling: instead of one monolithic agent, the main agent spawns focused sub-agents for specific tasks. Each sub-agent gets a clean context with the relevant agent profile loaded, runs autonomously with the same tool set (minus delegate/check_run to prevent recursion), and returns its result.

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
    "default": "claude-sonnet-4-6",
    "cheap": "claude-haiku-4-5",
    "powerful": "claude-opus-4-6"
  },
  "costControls": {
    "maxTokensPerSession": 200000,
    "maxTokensPerDay": 1000000,
    "warnAtPercentage": 80
  }
}
```

Sessions use `default` model. Can be overridden per-session or per-delegation. The `cheap` tier is for compaction summaries and other background work. Model names follow the provider's native naming — chatoyant resolves the right provider and API format automatically.

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
  source TEXT            -- 'conversation' | 'manual' | 'compaction'
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
2. Call LLM (using `cheap` model) to summarize them into a concise recap
3. Insert a compaction message (`is_compaction = 1`) as a new tree node
4. Re-parent the kept recent messages under the compaction node
5. The conversation chain is now: compaction summary → recent messages → head

Token counting uses the bundled approximate tokenizer (~4 chars per token). Compaction triggers automatically when assembled context exceeds the configured threshold.

---

## Skills

Skills are the extension mechanism. A skill is a markdown file in `skills/` that gives the agent domain knowledge about how to accomplish specific tasks. No code, no API, no lifecycle — just context injected into the system prompt.

### How It Works

1. Drop a `.md` file into `skills/`
2. On every agent loop iteration, all skill files are read and concatenated into the system prompt
3. The agent now knows how to do whatever the skill describes
4. Multiple skills compose naturally — they're just sections of the system prompt

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

That's it. No factory function, no parameter schema, no test harness. The LLM reads the instructions and executes them using Read, Write, Edit, Bash, and the other built-in tools. The `VERCEL_TOKEN` is in the secret store, synced to `process.env`, never visible in the prompt.

### Self-Extension

The agent can write new skills for itself. When it figures out how to do something through trial and error, it can Write a skill file into `skills/` to remember the procedure for next time. The skill is picked up on the next loop iteration automatically.

This is how the agent grows organically through usage — not through a plugin system, but through accumulating procedural knowledge in plain text files that anyone can read, edit, or share.

### Agent Profiles

For delegation, agent profiles in `agents/` serve the same role as skills but scoped to sub-agents. Each profile is a markdown file that defines a focused persona:

```markdown
# Code Reviewer

You are a thorough code reviewer. When given code to review:
- Check for bugs, security issues, and performance problems
- Suggest concrete improvements with code examples
- Be direct and specific, not vague
```

The delegate tool spawns a sub-agent loaded with that profile's system prompt. The main agent says "delegate this code review to the code-reviewer agent" and gets back the result. Profiles are discovered dynamically — drop a `.md` file in `agents/`, it's immediately available.

### Why Not a Plugin System

See **Design Principles → Tools Are Syscalls, Skills Are Programs**. The short version: skills (markdown) + secrets (env vars) + bash (code execution) cover everything a plugin system would, with zero API surface. The dominant pattern across OpenClaw, Cursor, Claude Code, and Goose is markdown context injection — not code plugins. People write instructions, not factory functions.

---

## OpenClaw Compatibility

### What's Compatible (Drop-In)

**SOUL.md** — loaded at conversation start, injected as the personality/behavior section of the system prompt. Same file, same format, same effect.

**SKILL.md files** — loaded from `skills/` directory, injected as capability context in the system prompt. Each SKILL.md adds knowledge about how to do something. Same markdown format as OpenClaw, same injection mechanism.

### What's Different (By Design)

**Session storage** — OpenClaw uses JSONL files that corrupt silently. Ghostpaw uses SQLite. Same tree semantics, better reliability. Sessions are not portable between the two systems, but that's fine — nobody migrates sessions.

**Skill management** — OpenClaw uses `openclaw.json` for skill registration and `/skills install @author/skill-name` from ClawHub. Ghostpaw uses a flat `skills/` directory. Drop markdown files in, they're loaded automatically. No registry, no marketplace, no attack surface.

**MCP** — OpenClaw supports MCP via mcporter CLI. Ghostpaw doesn't embed MCP support. The agent can call mcporter via Bash if needed — or write its own integration script. MCP is explicitly not in the kernel.

**Tool set** — OpenClaw ships ~20+ tools across groups (fs, runtime, web, ui, messaging, memory, sessions, automation). Ghostpaw ships a focused set of built-in tools that cover what coding agents actually use. The skipped tools (canvas, nodes, gateway management) are OpenClaw-specific infrastructure features.

**No plugin system** — OpenClaw supports JS/Python plugins, custom tool registration, and a marketplace. Ghostpaw has no plugin API. Skills (markdown) are the extension mechanism. The agent can write and execute code via Bash when needed.

### What's Skipped (And Why)

| OpenClaw Feature           | Why Skip                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas / A2UI              | Mobile node rendering. Niche. Not core agent functionality.                                                                                                  |
| Node pairing (iOS/Android) | Mobile companion app ecosystem. Not what coding agents need.                                                                                                 |
| Docker sandboxing          | Optional in OpenClaw (most users run `sandbox: "off"`). Security via tool policies instead.                                                                  |
| ClawHub marketplace        | Actively harmful (1,184 malicious skills). Local-only skills is a feature, not a limitation.                                                                 |
| macOS menu bar app         | UI wrapper. The web control UI serves the same purpose.                                                                                                      |
| Multi-agent routing        | Complex orchestration layer. The delegate tool covers the core use case. Full routing not day-1.                                                             |
| Browser tool (Playwright)  | Heavyweight dependency. Agent can drive Chrome via CDP through Bash + a skill, as Armin Ronacher demonstrated.                                               |
| JS/Python plugin system    | Over-engineering. Skills (markdown) + secrets (env vars) + bash (code execution) cover the same ground with zero API surface.                                |

---

## Channels

### Telegram (Day 1)

Telegram Bot API via HTTP long-polling. No WebSocket, no webhook server, no external dependency.

- Create bot via @BotFather → get token → store via secrets tool
- Ghostpaw starts long-polling loop: `GET /getUpdates` with offset
- Incoming messages → agent loop → response sent via `POST /sendMessage`
- Supports text, images (via multimodal LLM), and file attachments
- One bot can serve multiple chats (each chat = separate session)

Why Telegram first: cleanest bot API, 80% of OpenClaw users' primary channel, setup takes ~10 minutes, zero infrastructure.

### CLI Interactive Mode (Day 1)

REPL in the terminal. `process.stdin` / `process.stdout`. No channel adapter needed. The simplest possible interface. Works offline (except LLM API calls obviously).

### Web Control UI (Day 1)

SPA served via `node:http` on `localhost:PORT`.

- HTML/CSS/JS inlined in the compiled artifact (built from `src/ui/` at compile time)
- REST API for session management, config
- Server-Sent Events (SSE) for streaming agent responses to the browser (server→client, native HTTP, no WebSocket dependency)
- User messages sent via POST (client→server)
- Shows: active sessions, chat interface, token usage, logs, loaded skills
- No framework — vanilla HTML/CSS/JS. Clean, functional, not fancy.

### Future Channels (Not Day 1)

Discord, WhatsApp, Slack, Signal, etc. — each is an isolated adapter in `channels/`. Same pattern as Telegram: receive message → agent loop → send response. No architectural changes required.

---

## Security Model

- **No marketplace** — skills are local markdown files you control and audit. No download-and-execute from strangers.
- **Tool policies** — config-driven allow/deny lists per tool. Deny always wins.
- **File system boundaries** — Write tool defaults to workspace-only. Configurable.
- **Secret isolation** — API keys stored in SQLite, synced to `process.env` at startup. Never injected into the system prompt, never visible to the LLM.
- **Cost guardrails** — token budgets per session and per day. Hard stops, not just warnings.
- **Delegation circuit breaker** — sub-agents cannot delegate further. No runaway recursion.
- **Session serialization** — only one agent loop per session at a time. No race conditions on shared state.

---

## Workspace

Created automatically on first run — no separate `init` command needed. Ghostpaw detects missing workspace files, scaffolds them, and prompts for an API key (in TTY mode). Subsequent runs skip the setup entirely.

```
~/.ghostpaw/  (or wherever you run ghostpaw from — cwd IS the workspace)
  config.json             # models, cost controls, tool policies
  ghostpaw.db             # SQLite: sessions, messages, memory, runs, secrets, logs
  SOUL.md                 # personality/behavior (default provided, user customizes)
  agents/                 # agent profile .md files (for delegation)
  skills/                 # SKILL.md files (OpenClaw-compatible, loaded as prompt context)
  .ghostpaw/              # runtime files (cached web content, etc.)
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

## Benefits Over OpenClaw

- **Independent** — no corporate owner, no model bias, no vendor lock-in after OpenAI acquisition
- **Zero setup** — `npx ghostpaw` vs hours of broken configuration flows
- **Zero dependencies** — no npm install, no Docker, no daemon, no pairing wizards
- **Single artifact** — one `.mjs` file. Version it, pin it, `scp` it to any machine with Node.
- **Model-agnostic** — Anthropic, OpenAI, xAI, Google treated equally. No platform favoritism.
- **Actually reliable** — tiny surface area (tools + SQLite + one process) vs 430k+ lines of interdependent complexity
- **Secure by default** — no marketplace, no community upload, no malware vector. Skills are local files you control and audit.
- **Cost-controlled** — token budgets, model routing, hard session limits. No $200 runaways.
- **Fail-fast** — provider errors return immediately, not silent 20-minute timeouts
- **Works on first try** — no `openclaw doctor --fix` needed because nothing breaks during install
- **Ecosystem compatible** — reads OpenClaw SKILL.md/SOUL.md format. Community skills for free, corporate baggage stays behind.
- **Self-extending** — the agent writes its own skills through usage. Ships minimal, grows organically through accumulated procedural knowledge.

---

## Strategic Value

Not a revenue product. A **reputation engine + personal infrastructure**.

- **Personal tooling** — faster/cleaner than running OpenClaw for own agent workflows
- **Reputation** — "Ghostpaw: the independent single-file agent runtime" writes its own HN headline
- **Distribution** — GitHub stars, npm (`npx ghostpaw`), "OpenClaw alternative" search traffic, developer content — all organic
- **Force multiplier** — the agent that builds the products that generate the revenue
- **Zero cost to operate** — no hosting, no subscriptions, no operational overhead
