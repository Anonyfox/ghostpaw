# Architecture

Where things belong and how they relate. This document defines layers, modules, dependency rules, and system-level decisions. CODE.md governs how things are written; this document governs the structure they live in.

## The Deliverable

One file: `dist/ghostpaw.mjs`. One database at runtime: `ghostpaw.db`. One process. Everything in `src/` compiles into the single artifact via esbuild. Default content (initial souls, built-in skills, web client assets) ships as TypeScript files inside their feature module folders — separated by feature, not by type.

## Layers

Five layers, strictly ordered. Each layer may depend on layers below it. Never above. Never sideways at the same level (except within a layer's own modules).

```
5.  agent.ts          composition root — wires everything, few dozen lines
4.  channels/         user-facing — telegram, web, cli, tui
3.  tools/            agent syscalls — what the LLM can call
2.  core/             domain logic — one subfolder per feature
1.  lib/              pure utilities — domain-independent, standalone
```

**Dependency rules:**

- `lib/` depends on nothing except `node:` built-ins.
- `core/` depends on `lib/`. Never on tools, channels, or agent.
- `tools/` depends on `core/` and `lib/`. Never on channels or agent.
- `channels/` depends on `core/` and `lib/`. Never on tools or agent.
- `agent.ts` depends on everything. It is the only file that imports across all layers. This is the composition root: it creates the agent loop, registers tools, connects channels, and wires the real implementations together.

**Why channels don't depend on tools:** Channels drive the agent, which invokes tools. A channel never calls a tool directly. The channel provides UX for a feature (defined in core), and the agent loop handles tool execution.

## src/core/

The domain. Every feature is a subfolder. Each subfolder contains everything for that feature: types, logic, default content, tests. Nothing about a feature lives outside its folder.

Features include (not exhaustive — grows as the system grows):

- **sessions/** — session lifecycle, persistence, state transitions.
- **memory/** — memory storage, recall, embeddings, reconciliation.
- **souls/** — soul loading, refinement pipeline, default soul content (as .ts files).
- **skills/** — skill storage, craft/train/scout pipeline, default skills (as .ts files).
- **cost/** — budget tracking, cost guards, spend limits.
- **context/** — context assembly, system prompt construction, token management.
- **training/** — the training pipeline, experience processing.
- **delegation/** — sub-agent creation, specialist dispatch, result collection.

Core modules may depend on each other when there's a genuine relationship (context assembly reads from sessions, memory, souls, skills). These internal dependencies follow the same rules: import from the public surface (`index.ts`), never reach into internals. Circular dependencies between core modules are still forbidden — if two features need each other, extract the shared concept or use a callback wired at the agent level.

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
  secrets.ts
  delegate.ts
  check_run.ts
```

Complex tools become folders:

```
tools/
  mcp/
    index.ts          public surface
    transport.ts
    protocol.ts
    ...
```

A tool receives context (session, database handle, configuration) from the agent loop — it does not import the agent or reach up to channels. Tools depend on core modules for domain operations (the `memory` tool calls into `core/memory/`, the `skills` tool calls into `core/skills/`).

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

## src/agent.ts

The composition root. A single file, ideally a few dozen lines. It imports from all layers, creates the agent loop, registers tools, and exports what channels need to drive conversations.

If `agent.ts` is growing beyond ~50 lines, it's a signal that logic is leaking out of core into the wiring layer. Push it back down.

## src/index.ts

The CLI entrypoint. Argument parsing, bootstrap (the `--experimental-sqlite` self-re-exec), and dispatch to the appropriate channel based on how Ghostpaw was invoked.

## Recursive Scaling

The one-folder-per-concept and one-file-per-thing rules scale naturally.

A simple tool is one file: `tools/read.ts`. When it grows complex, it becomes a folder: `tools/mcp/index.ts`, `tools/mcp/transport.ts`, etc.

A simple channel might start as a few files in `channels/cli/`. As channel-specific UX for complex flows gets added, it grows into subfolders: `channels/cli/soul_refinement.ts`, `channels/cli/training_review.ts`.

The file tree always reflects actual complexity. Small things are small. Complex things are structured. Nothing is artificially flattened or inflated.

## Database

One SQLite file: `ghostpaw.db`. One connection. Managed in two layers:

**`lib/` provides the connection.** A generic database module that opens the file, sets sane pragmas (WAL mode, foreign keys, journal size, synchronous mode), and exposes the connection handle. This module knows nothing about tables, features, or domain logic. It's pure infrastructure.

**Each feature owns its tables.** `core/sessions/` creates and queries the `sessions` table. `core/memory/` creates and queries the `memories` table. `core/cost/` creates and queries the `runs` table. Schema creation, queries, migrations — all live inside the feature folder. No ORM, no query builder, no abstraction layer. Hand-tuned SQL, unit-tested.

**Testing:** `lib/` also provides a test database connection that returns an in-memory (`:memory:`) SQLite instance instead of a WAL-mode on-disk file. Fast, isolated, throwaway. Every feature's tests use this — no test ever touches a real database file. Network calls are mocked — no test ever makes a real HTTP request or LLM API call.

**Why this works:** SQLite is sequential and synchronous. Even when multiple channels or concurrent actions are in play, the database serializes access. No race conditions, no locking strategies, no transaction isolation concerns. This is a feature, not a limitation — it means each feature module can write straightforward SQL without worrying about what other modules are doing.

## System Decisions

Concrete decisions that apply across the codebase. When in doubt, these are authoritative.

- **ESM only.** No CJS anywhere in application code.
- **Node 22.5+.** Use modern APIs freely.
- **`node:sqlite` for all persistence.** One database file. Dynamically imported always. Connection managed by `lib/`, tables owned by features.
- **Dates are stored as ISO 8601 UTC strings.** No local time anywhere in storage or logic. Display formatting is a channel concern.
- **IDs are ULIDs** where unique identifiers are needed. Sortable, timestamp-embedded, no coordination required.
- **Secrets never enter conversation context.** Stored in the database, accessed by the `secrets` tool, injected into tool execution — but never included in messages sent to the LLM.
- **Default content (souls, skills) ships as TypeScript.** Bundled into the artifact. Written to disk on first run (`init`), then owned by the user.
- **`chatoyant` is the LLM abstraction.** Provider-agnostic. No direct HTTP calls to model APIs.
- **`grammY` for Telegram.** Long-polling, offline catch-up.
- **Preact for web client.** TSX components, Bootstrap CSS, client-side routing. Bundled into the server as a text asset.
- **`marked` for markdown rendering** in channels that display rich text.
