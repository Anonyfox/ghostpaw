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

One `.mjs` file that IS the agent. CLI tool, runtime, and importable library in one artifact. Self-manages a workspace of md/js files on the host. Self-extends through usage. Reads OpenClaw skill/soul format natively.

Published as `ghostpaw` on npm. Three ways to run:

```bash
npx ghostpaw              # zero-install, works immediately
ghostpaw                  # after global install
node ghostpaw.mjs         # from the raw artifact
```

---

## Architecture

### Build Pipeline

TypeScript project → esbuild (`--format=esm`) → single `ghostpaw.mjs` file with shebang (`#!/usr/bin/env node`).

**ESM-only.** The entire project — compiled artifact, extensions, library usage — is native ESM. No CJS, no interop hacks.

- Output is `.mjs` so it's unambiguously ESM regardless of where it's placed on disk.
- Workspace init creates `~/.ghostpaw/package.json` with `{ "type": "module" }` so agent-written extensions in `extensions/*.js` are ESM natively.
- Dual-mode detection uses `import.meta.url` (ESM-only feature). `import.meta.dirname` / `import.meta.filename` available since Node 21.2+.
- Dynamic `import()` for extension loading and cache-bust hot-reload (`import(path + '?v=' + Date.now())`).
- Top-level `await` works in extensions natively.
- esbuild handles any CJS-only build-time npm deps during bundling. Output is clean ESM.

```
src/
  index.ts              # entry point: CLI parser + library exports
  core/
    loop.ts             # agent loop
    tools.ts            # 4 core tools: Read, Write, Edit, Bash
    context.ts          # system prompt assembly, compaction
    session.ts          # SQLite session management, tree operations
    cost.ts             # token tracking, budget enforcement
  providers/
    types.ts            # shared request/response types
    anthropic.ts        # Claude adapter (~100-150 lines)
    openai.ts           # GPT adapter (~100-150 lines)
    google.ts           # Gemini adapter (~100-150 lines)
    stream.ts           # SSE parser (~80 lines)
  extensions/
    loader.ts           # dynamic import, hot-reload, test validation
    builtins.ts         # pre-bundled convenience extensions
  channels/
    telegram.ts         # Telegram Bot API long-polling adapter
  ui/
    server.ts           # node:http server, SSE for streaming
    app.html            # SPA inlined as string at build time
  lib/
    readability.ts      # HTML → markdown (for web_fetch)
    tokenizer.ts        # approximate token counting
    diff.ts             # string diff/patch (for Edit tool)

dist/
  ghostpaw.mjs          # single compiled artifact (ESM)

package.json            # name: "ghostpaw", bin: { ghostpaw: "./dist/ghostpaw.mjs" }
```

Dev dependencies (esbuild, typescript, etc.) are build-time only. The output has zero runtime npm dependencies. Everything is bundled in.

### Runtime: Node 22.5+ Native APIs Only

| Need            | Node.js API                 | Notes                                                                                                             |
| --------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Database        | `node:sqlite`               | Sessions, memory, logs, extension state. One file: `ghostpaw.db`. Config stays in `config.json` (human-editable). |
| HTTP server     | `node:http`                 | Control UI, REST API, Server-Sent Events for response streaming.                                                  |
| LLM calls       | `fetch()`                   | Global in Node 22. All provider APIs are just HTTP POST + SSE.                                                    |
| Shell execution | `node:child_process`        | spawn/exec for Bash tool and process management.                                                                  |
| File system     | `node:fs`                   | Read/Write/Edit tools. `fs.watch()` for extension hot-reload.                                                     |
| Testing         | `node:test` + `node:assert` | Validate extensions before loading.                                                                               |
| CLI parsing     | `node:util.parseArgs`       | Built-in arg parser, no commander needed.                                                                         |
| Crypto          | `node:crypto`               | Token generation, hashing.                                                                                        |

### Dual-Mode Entry Point

The single file detects how it's invoked:

**As CLI** (`ghostpaw [command]`): runs the specified command or interactive REPL.

```bash
ghostpaw                          # interactive chat (default)
ghostpaw serve                    # web UI + API on localhost
ghostpaw run "do the thing"       # one-shot prompt, exits when done
ghostpaw init                     # create workspace, prompt for API key
ghostpaw test                     # run node:test on all extensions
ghostpaw telegram                 # start Telegram bot long-polling
```

**As library** (`import` from another ESM file): exports the core API.

```javascript
import { createAgent } from "ghostpaw";

const agent = createAgent({ workspace: "./my-workspace" });
const result = await agent.run("analyze this codebase");

agent.tools.register("custom_tool", async (params) => {
  /* ... */
});
agent.hooks.on("before_tool_call", (tool, params) => {
  /* ... */
});
```

Detection: check `import.meta.url` against `process.argv[1]`. If match → CLI mode. Otherwise → library exports only, no side effects.

---

## Agent Loop

### Core Flow

1. **Context assembly** — build system prompt in this order:
   - SOUL.md (personality/behavior — the agent's identity)
   - SKILL.md files from `skills/` (capability context — what the agent knows how to do)
   - Tool descriptions (structured definitions of all available tools — core + extensions)
   - Cost/budget notice (current token usage, remaining budget)
   - Session history from SQLite (walk the message tree from head to root, apply compaction if needed)
2. **Model call** — send assembled prompt to LLM provider via fetch, stream response
3. **Parse response** — extract text and/or tool calls from streamed SSE chunks
4. **Tool execution** — if tool calls present, execute each, collect results
5. **Feed back** — append tool results to conversation, go to step 2
6. **Persist** — when model returns final text (no more tool calls), persist full exchange to SQLite, update token counters
7. **Budget check** — if session token budget exceeded, warn and stop

Runs are serialized per-session (only one agent loop per session at a time) to prevent races and keep history consistent.

### Core Tools (4 — the Pi primitives)

| Tool      | Implementation             | Notes                                                                                                                                                           |
| --------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read**  | `node:fs.readFile`         | Read file contents. Supports line ranges.                                                                                                                       |
| **Write** | `node:fs.writeFile`        | Create or overwrite files. Creates directories as needed.                                                                                                       |
| **Edit**  | String diff/replace        | Find unique string in file, replace with new string. The critical tool — must be rock-solid. Uses bundled diff logic for fuzzy matching when exact match fails. |
| **Bash**  | `node:child_process.spawn` | Execute shell commands. Configurable timeout (default 120s). Returns stdout + stderr + exit code. Supports background execution with process tracking.          |

These 4 tools are the only hard-coded tools. Everything else is a bundled extension.

### Bundled Extensions (pre-loaded, replaceable)

Ship in the compiled artifact but implemented as extensions — not hard-coded. Users can disable, modify, or replace any of them.

| Extension          | What it does                  | Implementation                                                                                     |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **web_search**     | Search the web                | `fetch()` to Brave Search API. Requires API key in config.                                         |
| **web_fetch**      | URL → readable markdown       | `fetch()` + bundled readability parser. Cached 15 min.                                             |
| **image**          | Analyze image via LLM         | Multimodal API call to configured provider.                                                        |
| **memory**         | Vector search + retrieval     | Store embeddings in SQLite, brute-force cosine similarity in JS. Embeddings generated via LLM API. |
| **process**        | Background process management | Track spawned processes. Poll output, write stdin, kill. State in SQLite.                          |
| **loop_detection** | Tool call guardrails          | Track recent tool calls, detect repeating patterns, warn/stop on loops. Configurable thresholds.   |

This keeps the Pi philosophy (4 primitive tools) while being practically useful out of the box. The separation is clean: core tools are in the kernel, bundled extensions are the first userland.

---

## LLM Providers

### Adapter Pattern

Each provider is a thin adapter (~100-150 lines) that normalizes to a shared interface:

```typescript
interface LLMAdapter {
  chat(params: ChatRequest): AsyncGenerator<ChatChunk>;
}

interface ChatRequest {
  model: string;
  systemPrompt: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
}

interface ChatChunk {
  type:
    | "text_delta"
    | "tool_call_start"
    | "tool_call_delta"
    | "tool_call_end"
    | "usage";
  // ... normalized fields
}
```

Each adapter handles:

- Auth header format (Bearer token vs x-api-key vs OAuth)
- Message schema translation (content blocks vs string content vs parts array)
- Tool call format normalization (Anthropic's tool_use blocks vs OpenAI's function calls vs Google's functionCall)
- SSE stream parsing (each provider has slightly different event shapes)
- Error normalization — **fail fast, always.** Network errors, auth errors, rate limits return immediately. Never hang.

### Streaming

All three providers use SSE (Server-Sent Events) for streaming. The bundled SSE parser (~80 lines) handles the low-level chunking. Each adapter maps provider-specific events to the normalized `ChatChunk` type.

### Model Configuration

```json
{
  "providers": {
    "anthropic": { "apiKey": "sk-..." },
    "openai": { "apiKey": "sk-..." },
    "google": { "apiKey": "..." }
  },
  "models": {
    "default": "anthropic/claude-sonnet-4",
    "cheap": "google/gemini-2.0-flash",
    "powerful": "anthropic/claude-opus-4"
  },
  "costControls": {
    "maxTokensPerSession": 200000,
    "maxTokensPerDay": 1000000,
    "warnAtPercentage": 80
  }
}
```

Sessions use `default` model. Can be overridden per-session or per-extension call. The `cheap` tier is for compaction summaries, memory embedding generation, and other background work.

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
  metadata TEXT  -- JSON: extension state, channel info, etc.
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_id TEXT REFERENCES messages(id),
  role TEXT NOT NULL,  -- 'system' | 'user' | 'assistant' | 'tool_call' | 'tool_result'
  content TEXT,
  model TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_compaction INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE memory (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  content TEXT NOT NULL,
  embedding BLOB,  -- float32 array stored as blob
  created_at INTEGER NOT NULL,
  source TEXT       -- 'conversation' | 'manual' | 'compaction'
);

CREATE TABLE extensions_state (
  extension_id TEXT NOT NULL,
  session_id TEXT,
  key TEXT NOT NULL,
  value TEXT,  -- JSON
  PRIMARY KEY (extension_id, session_id, key)
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

Token counting uses the bundled approximate tokenizer. Compaction triggers automatically when assembled context exceeds 80% of the model's context window.

---

## OpenClaw Compatibility

### What's Compatible (Drop-In)

**SOUL.md** — loaded at conversation start, injected as the personality/behavior section of the system prompt. Same file, same format, same effect.

**SKILL.md files** — loaded from `skills/` directory, injected as capability context in the system prompt. Each SKILL.md adds knowledge about how to do something. Same markdown format as OpenClaw, same injection mechanism.

**Bootstrap context** — additional markdown files injected into the system prompt before the conversation starts. Same concept as OpenClaw's `agent:bootstrap` hook.

### What's Different (By Design)

**Session storage** — OpenClaw uses JSONL files that corrupt silently. Ghostpaw uses SQLite. Same tree semantics, better reliability. Sessions are not portable between the two systems, but that's fine — nobody migrates sessions.

**Skill management** — OpenClaw uses `openclaw.json` for skill registration and `/skills install @author/skill-name` from ClawHub. Ghostpaw uses a flat `skills/` directory. Drop SKILL.md files in, they're loaded automatically. No registry, no marketplace, no attack surface.

**MCP** — OpenClaw supports MCP via mcporter CLI. Ghostpaw doesn't embed MCP support. The agent can call mcporter via Bash if needed. Or — following Pi's philosophy — the agent writes its own integration code. MCP is explicitly not in the kernel.

**Tool set** — OpenClaw ships ~20+ tools across groups (fs, runtime, web, ui, messaging, memory, sessions, automation). Ghostpaw ships 4 core tools + 6 bundled extensions that cover everything people actually use for coding agents. The skipped tools (canvas, nodes, gateway management) are OpenClaw-specific infrastructure features.

### What's Skipped (And Why)

| OpenClaw Feature           | Why Skip                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas / A2UI              | Mobile node rendering. Niche. Not core agent functionality.                                                                                                              |
| Node pairing (iOS/Android) | Mobile companion app ecosystem. Not what coding agents need.                                                                                                             |
| Docker sandboxing          | Optional in OpenClaw (most users run `sandbox: "off"`). Security via tool policies instead.                                                                              |
| ClawHub marketplace        | Actively harmful (1,184 malicious skills). Local-only skills is a feature, not a limitation.                                                                             |
| macOS menu bar app         | UI wrapper. The web control UI serves the same purpose.                                                                                                                  |
| Multi-agent routing        | Complex orchestration layer. Can be built as an extension if needed. Not day-1.                                                                                          |
| Browser tool (Playwright)  | Heavyweight dependency. Agent can drive Chrome directly via CDP over WebSocket through Bash + a skill, as Armin Ronacher demonstrated. Can be a bundled extension later. |

---

## Extension System

### Extension Contract

An extension is a JS file in the `extensions/` directory that exports a default factory function:

```javascript
export default function (ghostpaw) {
  // Register new tools
  ghostpaw.tools.register("my_tool", {
    description: "Does something useful",
    parameters: { query: { type: "string", required: true } },
    execute: async (params) => {
      const result = await ghostpaw.run.bash(
        `curl -s "https://api.example.com?q=${params.query}"`,
      );
      return result.stdout;
    },
  });

  // Hook into lifecycle
  ghostpaw.hooks.on("before_tool_call", (tool, params) => {
    ghostpaw.db.insert("tool_log", { tool, params, ts: Date.now() });
  });

  // Persist state across sessions
  const state = ghostpaw.state.get("my_extension", "counter") ?? 0;
  ghostpaw.state.set("my_extension", "counter", state + 1);
}

// Optional: companion test (run by node:test after loading)
export async function test({ describe, it, assert, agent }) {
  describe("my_tool", () => {
    it("returns results for valid query", async () => {
      const result = await agent.tools.call("my_tool", { query: "test" });
      assert.ok(result.length > 0);
    });
  });
}
```

### Core API (Exposed to Extensions)

```typescript
interface GhostpawAPI {
  llm: {
    chat: (messages, options?) => AsyncGenerator<ChatChunk>;
    embed: (text) => Promise<number[]>;
  };
  db: {
    query: (sql, params?) => any[];
    insert: (table, data) => void;
    run: (sql, params?) => void;
  };
  fs: {
    read: (path) => Promise<string>;
    write: (path, content) => Promise<void>;
    edit: (path, oldStr, newStr) => Promise<boolean>;
  };
  run: {
    bash: (command, options?) => Promise<ExecResult>;
  };
  session: {
    current: () => Session;
    branch: (fromMessageId) => Session;
    rewind: (toMessageId) => void;
  };
  tools: {
    register: (name, definition) => void;
    unregister: (name) => void;
    call: (name, params) => Promise<any>;
    list: () => ToolDefinition[];
  };
  hooks: {
    on: (event, handler) => void;
    off: (event, handler) => void;
  };
  state: {
    get: (extensionId, key) => any;
    set: (extensionId, key, value) => void;
  };
  skills: {
    load: (path) => void;
    list: () => string[];
  };
}
```

### Lifecycle

1. On startup: scan `extensions/` directory
2. For each `.js` file: call `default(ghostpawAPI)` to load (registers tools, hooks, state)
3. If `test()` export exists: run it via `node:test` to validate the loaded extension
4. If tests pass: extension stays active
5. If tests fail: rollback (unregister tools/hooks), log warning, keep previous version if available
6. `node:fs.watch()` on `extensions/` for changes
7. On change: re-import with cache bust (`import(path + '?v=' + Date.now())`), repeat steps 2-5

The agent itself can write new extensions into `extensions/`, which triggers this same lifecycle automatically. The agent extends itself.

---

## Channels

### Telegram (Day 1)

Telegram Bot API via HTTP long-polling. No WebSocket, no webhook server, no external dependency.

- Create bot via @BotFather → get token → put in config
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
- REST API for session management, config, extension listing
- Server-Sent Events (SSE) for streaming agent responses to the browser (server→client, native HTTP, no WebSocket dependency)
- User messages sent via POST (client→server)
- Shows: active sessions, chat interface, token usage, logs, loaded skills/extensions
- No framework — vanilla HTML/CSS/JS. Clean, functional, not fancy.

### Future Channels (Not Day 1)

Discord, WhatsApp, Slack, Signal, etc. — each is an isolated adapter in `channels/`. Same pattern as Telegram: receive message → agent loop → send response. Added as extensions or built-in adapters when needed. No architectural changes required.

---

## Security Model

- **No marketplace** — skills are local markdown files. No download-and-execute from strangers.
- **Tool policies** — config-driven allow/deny lists per tool. Deny always wins.
- **File system boundaries** — Write tool defaults to workspace-only. Configurable.
- **API key isolation** — keys in config.json with restricted file permissions. Never injected into system prompt or exposed to extensions beyond the `ghostpaw.llm` API.
- **Extension validation** — every extension must pass `node:test` before activation. Malformed or failing code never loads.
- **Cost guardrails** — token budgets per session and per day. Hard stops, not just warnings.
- **Loop detection** — built-in guardrail against runaway tool call loops.

---

## Workspace

Created automatically on first run. Ghostpaw prompts for API key, writes default config.

```
~/.ghostpaw/
  package.json            # { "type": "module" } for ESM extensions
  config.json             # providers, models, cost controls, tool policies
  ghostpaw.db             # SQLite: sessions, messages, memory, extension state, logs
  SOUL.md                 # personality/behavior (default provided, user customizes)
  skills/                 # SKILL.md files (OpenClaw-compatible, loaded as prompt context)
  extensions/             # JS modules (agent-created or manually added)
```

The agent operates in whatever directory you run it from — cwd IS the workspace. Sessions are scoped by cwd path. `~/.ghostpaw/` is global config and state. No managed workspace directory needed.

All state in SQLite. All behavior in markdown + JS files. Clean separation: the compiled `ghostpaw.mjs` is immutable kernel, everything in `~/.ghostpaw/` is mutable userland.

---

## Risk Assessment

| Risk                                 | Severity | Mitigation                                                                                                                                                         |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider APIs change, adapters break | Low      | ~100-150 lines per adapter, isolated changes, 2-3 updates/year max. Agent can potentially patch its own adapters via self-extending.                               |
| Single file becomes limiting         | Low      | The file is the kernel. All complexity lives in userland extensions via dynamic `import()`. Node.js handles this natively.                                         |
| OpenClaw fixes their problems        | Very Low | Just got acquired by OpenAI — trajectory is corporate lock-in, not simplicity. Independence-minded users are leaving.                                              |
| `node:sqlite` experimental bugs      | Low      | SQLite itself is the most battle-tested DB on earth. Node binding is thin. Actively stabilizing toward stable.                                                     |
| Agents reliably building software    | Medium   | The actual hard problem — prompt engineering + tool quality, not architecture. OpenClaw community's months of skill/prompt iteration available to copy and modify. |

---

## Benefits Over OpenClaw

- **Independent** — no corporate owner, no model bias, no vendor lock-in after OpenAI acquisition
- **Zero setup** — `npx ghostpaw` vs hours of broken configuration flows
- **Zero dependencies** — no npm install, no Docker, no daemon, no pairing wizards
- **Single artifact** — one `.mjs` file. Version it, pin it, `scp` it to any machine with Node.
- **Model-agnostic** — Anthropic, OpenAI, Google treated equally. No platform favoritism.
- **Actually reliable** — tiny surface area (4 tools + SQLite + one process) vs 430k+ lines of interdependent complexity
- **Secure by default** — no marketplace, no community upload, no malware vector. Skills are local files you control and audit.
- **Cost-controlled** — token budgets, model routing, hard session limits. No $200 runaways.
- **Fail-fast** — provider errors return immediately, not silent 20-minute timeouts
- **Works on first try** — no `openclaw doctor --fix` needed because nothing breaks during install
- **Ecosystem compatible** — reads OpenClaw SKILL.md/SOUL.md format. Community skills for free, corporate baggage stays behind.
- **Self-extending** — the agent improves itself by writing extensions. Ships minimal, grows organically through usage.

---

## Strategic Value

Not a revenue product. A **reputation engine + personal infrastructure**.

- **Personal tooling** — faster/cleaner than running OpenClaw for own agent workflows
- **Reputation** — "Ghostpaw: the independent single-file agent runtime" writes its own HN headline
- **Distribution** — GitHub stars, npm (`npx ghostpaw`), "OpenClaw alternative" search traffic, developer content — all organic
- **Force multiplier** — the agent that builds the products that generate the revenue
- **Zero cost to operate** — no hosting, no subscriptions, no operational overhead
