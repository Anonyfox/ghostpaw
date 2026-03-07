# Architecture

Where things belong and how they relate. This document defines layers, modules, dependency rules, and system-level decisions. CODE.md governs how things are written; this document governs the structure they live in.

## The Deliverable

One file: `dist/ghostpaw.mjs`. One database at runtime: `ghostpaw.db`. One process. Everything in `src/` compiles into the single artifact via esbuild. Default content (initial souls, built-in skills, web client assets) ships as TypeScript files inside their feature module folders — separated by feature, not by type.

## Layers

Five layers, strictly ordered. Each layer may depend on layers below it. Never above. Never sideways at the same level (except within a layer's own modules).

```
5.  channels/         user-facing — telegram, web, cli, tui
4.  harness/          entity composition, context assembly, oneshots
3.  tools/            agent syscalls — what the LLM can call
2.  core/             domain logic — one subfolder per feature
1.  lib/              pure utilities — domain-independent, standalone
```

**Dependency rules:**

- `lib/` depends on nothing except `node:` built-ins.
- `core/` depends on `lib/`. Never on tools, harness, or channels. Core modules never make discretionary LLM calls — `core/chat` executes the mechanical turn pipeline it's given, but all semantic judgment (summarization, title generation, classification) lives in the harness as oneshots.
- `tools/` depends on `core/` and `lib/`. Never on harness or channels. When a tool needs a capability that lives above it (e.g. delegation), the harness injects a callback at wiring time.
- `harness/` depends on `core/`, `tools/`, and `lib/`. Never on channels. The harness is the ghost in operational form — it composes core modules, registers tools, assembles context, and provides the entity that channels drive.
- `channels/` depends on `harness/` for entity operations and `core/` for direct data reads (session listing, history retrieval). Never on tools directly.

**Why channels don't depend on tools:** Channels drive the entity, which provides tools to the LLM turn. A channel never calls a tool directly. The channel provides UX, the harness provides the composed entity, and the core turn pipeline handles tool execution.

## Bootstrap

A lifecycle phase, not a layer. Before the harness or any channel can run, the system must be bootstrapped: database opened, tables created, mandatory souls ensured, secrets loaded. This is a top-level concern (`src/bootstrap.ts` or equivalent) that runs once at startup. Every layer depends on bootstrap having completed, but no layer imports from it — it runs before anything else.

## src/core/

The domain. Every feature is a subfolder. Each subfolder contains everything for that feature: types, logic, default content, tests. Nothing about a feature lives outside its folder.

Features include (not exhaustive — grows as the system grows):

- **chat/** — mechanical turn execution pipeline. Session lifecycle, message persistence, history traversal, turn locking, token estimation. Accepts a system prompt, tools, and chat factory from above — it executes what it's given. The `CompactFn` callback allows the harness to inject compaction logic that runs inside the session lock without core knowing about the LLM call.
- **memory/** — memory storage, recall, embeddings, reconciliation.
- **souls/** — soul loading, rendering, refinement pipeline, default soul content (as .ts files).
- **config/** — typed configuration with known keys, defaults, and validation.
- **secrets/** — encrypted secret storage, provider key management.
- **models/** — provider registry, model discovery, API key resolution.
- **skills/** — skill storage, craft/train/scout pipeline, default skills (as .ts files).
- **(cost was eliminated)** — cost queries live in `chat/` (they query sessions); pure cost computation lives in `lib/cost/`.

Core modules never make discretionary LLM calls. `core/chat` is a special case: its purpose IS to execute the LLM turn pipeline, but it doesn't initiate auxiliary LLM tasks (like summarization or title generation). Those live in `harness/oneshots/`.

Core modules may depend on each other when there's a genuine relationship (e.g. memory recall reads config for tuning parameters). These internal dependencies follow the same rules: import from the public surface (`index.ts`), never reach into internals. Circular dependencies between core modules are still forbidden — if two features need each other, extract the shared concept or use a callback wired at the harness level.

## src/tools/

The agent's syscalls. Each tool is a file or folder depending on complexity.

Simple tools (a few lines to ~100 lines) are single files:

```
tools/
  read.ts
  write.ts
  edit.ts
  bash.ts
  grep.ts
  ls.ts
  web_search.ts
  web_fetch.ts
  memory.ts
  skills.ts
  train.ts
  scout.ts
  delegate.ts
  check_run.ts
```

Tools with multiple related operations become folders:

```
tools/
  secrets/
    index.ts          public surface — exports factory functions
    list_secrets.ts   one tool per file
    set_secret.ts
    remove_secret.ts
  mcp/
    index.ts          public surface
    transport.ts
    protocol.ts
    ...
```

A tool receives context (session, database handle, configuration) from the harness — it does not import the harness or reach up to channels. Tools depend on core modules for domain operations (the `memory` tool calls into `core/memory/`, the `config` tool calls into `core/config/`).

## src/harness/

The ghost in operational form. The harness composes core modules into a working entity — the thing channels actually talk to.

**Entity.** The main composition. `createEntity(options)` produces an `Entity` with `streamTurn` and `executeTurn` methods. A channel hands it a session ID and user message; the entity handles everything: soul loading, memory recall, context assembly, tool registration, model resolution, compaction, and post-turn operations. The entity is a thin coordinator — it delegates every operation to a dedicated function, staying under 50 lines.

**Context assembly.** `assembleContext(db, userMessage, soulId?)` builds the system prompt fresh each turn: rendered soul (identity, essence, traits), environment (current date), recalled memories relevant to the user's message, and tool guidance. This is the ghost's perception — what it sees when a human speaks.

**Oneshots.** `harness/oneshots/` contains fine-tuned, single-purpose LLM calls for semantic tasks that pure code can't handle: title generation, compaction summarization, and (future) classification, extraction, and routing. Each oneshot is individually tuned with its own system prompt, model parameters, and token limits. Use them liberally — ad-hoc LLM calls are an unfair advantage of an AI-first system.

**Orchestration (future).** Complex multi-step operations like haunting, training, and delegation will live in the harness as orchestration modules that compose multiple core operations and oneshots into coherent workflows.

## src/channels/

Every way a user interacts with Ghostpaw. Each channel is a subfolder.

```
channels/
  telegram/
  web/
    server/
    client/           Preact SPA, Bootstrap CSS, proper routing
  cli/                oneshot prompts, explicit commands
  tui/                proper terminal UI (not readline)
```

### Feature Parity Contract

Every feature implemented in core works in every channel. No exceptions. No "this only works in the web UI." No degrading to the smallest common denominator.

Each channel provides the best UX that its medium allows. Soul refinement in web might be a multi-pane form with live preview. In Telegram it might use inline keyboards and callback queries. In CLI it might be a guided prompt sequence. In TUI it might use panels and focus navigation. Different presentations, same underlying flow, all excellent.

This means channels do real, deep UX work — not thin wrappers. A Telegram channel that just dumps plain text is not meeting the bar. Every channel interaction should feel like it was designed specifically for that medium, by someone who deeply understands what that medium does well.

### Multi-Turn Interactive Flows

Many LLM interactions — even simple ones like asking for user approval — require dynamic, multi-turn state. Complex flows (soul refinement, training review, skill creation) are multi-step interactive processes.

Core models these flows as state that channels can drive at their own pace. The channel controls presentation and user interaction. Core controls the logic, transitions, and validation. The exact shape of this abstraction is a design problem that requires full LLM-level thinking for each flow — there is no one-size-fits-all pattern. Each feature's interactive flow is designed individually to be as natural as possible across all channels.

### The Web Channel

Web is a channel, structurally. The fact that it ships an embedded Preact SPA for its own API is an implementation detail. The `server/` subfolder handles HTTP, auth, routing, API endpoints. The `client/` subfolder is the Preact frontend — TSX components, Bootstrap CSS, client-side routing. The only acceptable "leak" is that the top-level build configuration knows about the client build (to bundle it into the artifact). This is minor and accepted.

## src/lib/

Pure utilities. Domain-independent. Standalone. Unit-tested. The only shared code in the entire codebase.

**Rule of three:** Code is only promoted to lib when a substantially similar pattern appears the third time. First and second occurrence live where they're used. Third time, consider extraction into a named, well-tested lib function. "Might be useful later" is not justification.

**Check before writing:** Before writing any utility-like code, check what's already in `lib/`. Reuse is cheaper and safer than reinvention. This is a strong convention, not optional.

**Organization:** `lib/` follows the same structural rules as everything else — one file per function/concept, colocated tests, folders when complexity demands. Files are named for what they do: `truncate.ts`, `hash.ts`, `parse_duration.ts` — not `string_utils.ts` or `helpers.ts`.

## src/index.ts

The CLI entrypoint. Warning suppression, argument parsing, bootstrap, and dispatch to the appropriate channel based on how Ghostpaw was invoked. This is where the entity is created and handed to whatever channel the user chose.

## Recursive Scaling

The one-folder-per-concept and one-file-per-thing rules scale naturally.

A simple tool is one file: `tools/read.ts`. When it grows complex, it becomes a folder: `tools/mcp/index.ts`, `tools/mcp/transport.ts`, etc.

A simple channel might start as a few files in `channels/cli/`. As channel-specific UX for complex flows gets added, it grows into subfolders: `channels/cli/soul_refinement.ts`, `channels/cli/training_review.ts`.

The file tree always reflects actual complexity. Small things are small. Complex things are structured. Nothing is artificially flattened or inflated.

## Database

One SQLite file: `ghostpaw.db`. One connection. Managed in two layers:

**`lib/` provides the connection.** A generic database module that opens the file, sets sane pragmas (WAL mode, foreign keys, journal size, synchronous mode), and exposes the connection handle. This module knows nothing about tables, features, or domain logic. It's pure infrastructure.

**Each feature owns its tables.** `core/chat/` creates and queries the `sessions` and `messages` tables. `core/memory/` creates and queries the `memories` table. `core/cost/` queries session data for spend tracking. Schema creation, queries, migrations — all live inside the feature folder. No ORM, no query builder, no abstraction layer. Hand-tuned SQL, unit-tested.

**SQL lives in core, nowhere else.** SQL statements (`.prepare()`, `.exec()`, raw `SELECT`/`INSERT`/`UPDATE`/`DELETE`) may only exist inside `core/` and `lib/`. Layers above core access data exclusively through the public API exported from each core module's `index.ts`. Raw SQL in channels, harness, or tools is a boundary violation equivalent to importing internal files. When a layer above core needs data that isn't exposed, the correct response is to add a function to the owning core module — never to write SQL in the caller.

**Testing:** `lib/` also provides a test database connection that returns an in-memory (`:memory:`) SQLite instance instead of a WAL-mode on-disk file. Fast, isolated, throwaway. Every feature's tests use this — no test ever touches a real database file. Network calls are mocked — no test ever makes a real HTTP request or LLM API call.

**Why this works:** SQLite is sequential and synchronous. Even when multiple channels or concurrent actions are in play, the database serializes access. No race conditions, no locking strategies, no transaction isolation concerns. This is a feature, not a limitation — it means each feature module can write straightforward SQL without worrying about what other modules are doing.

## System Decisions

Concrete decisions that apply across the codebase. When in doubt, these are authoritative.

- **ESM only.** No CJS anywhere in application code.
- **Node 24+.** Native TypeScript type stripping, `node:sqlite` without flags. No transpiler needed to run source or tests.
- **`.ts` extensions in imports.** Enables both esbuild bundling and Node's native TS execution. `allowImportingTsExtensions` in tsconfig.
- **`node:sqlite` for all persistence.** One database file. Dynamically imported always. Connection managed by `lib/`, tables owned by features.
- **Timestamps are Unix milliseconds (INTEGER).** `Date.now()` everywhere. Compact, fast comparisons, native SQLite sorting. Human-readable formatting is a channel concern.
- **IDs are INTEGER PRIMARY KEY.** SQLite autoincrement. Simple, fast, zero coordination. Sortable by insertion order. External references use session keys (e.g. `web:chat:123`, `telegram:456`).
- **Secrets never enter conversation context.** Stored in the database, accessed by the `secrets` tool, injected into tool execution — but never included in messages sent to the LLM.
- **Default content (souls, skills) ships as TypeScript.** Bundled into the artifact. Written to disk on first run (`init`), then owned by the user.
- **`citty` for CLI.** Subcommand routing, auto-generated help, error handling. Zero dependencies, built on `node:util.parseArgs`.
- **`chatoyant` is the LLM abstraction.** Provider-agnostic. No direct HTTP calls to model APIs.
- **`grammY` for Telegram.** Long-polling, offline catch-up.
- **Preact for web client.** TSX components, Bootstrap CSS, client-side routing. Bundled into the server as a text asset.
- **`marked` for markdown rendering** in channels that display rich text.
