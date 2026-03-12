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

- `lib/` depends on `node:` built-ins and bundled npm dependencies (`chatoyant`, `marked`, etc.). These are foundational packages the project vendors — not arbitrary third-party code. No database access.
- `core/` depends on `lib/`. Never on tools, harness, or channels. Core modules never make discretionary LLM calls — `core/chat` executes the mechanical turn pipeline it's given, but all semantic judgment (summarization, title generation, classification) lives in the harness as oneshots.
- `tools/` depends on `core/` and `lib/`. Never on harness or channels. When a tool needs a capability that lives above it (e.g. delegation), the harness injects a callback at wiring time.
- `harness/` depends on `core/`, `tools/`, and `lib/`. Never on channels. The harness is the ghost in operational form — it composes core modules, registers tools, assembles context, and provides the entity that channels drive.
- `channels/` depends on `harness/` for entity operations and `core/` for direct data reads (session listing, history retrieval). Never on tools directly.

**Namespace boundary rules:**

- Cross-subsystem `core` imports default to `src/core/<feature>/api/read/**`.
- `src/core/<feature>/api/write/**` is a privileged mutation surface. It may be imported by `tools/` and by explicitly approved harness orchestration paths, not by arbitrary core callers.
- `src/core/<feature>/runtime/**` is for startup/bootstrap/composition only.
- `src/core/<feature>/internal/**` is private to the owning subsystem.
- The same pattern applies upward as folders grow: `tools/<namespace>/public/**` vs `tools/<namespace>/internal/**`, `harness/public/**` vs `harness/internal/**`, and equivalent channel-local splits.

**Why channels don't depend on tools:** Channels drive the entity, which provides tools to the LLM turn. A channel never calls a tool directly. The channel provides UX, the harness provides the composed entity, and the core turn pipeline handles tool execution.

## Bootstrap

A lifecycle phase, not a layer. Before the harness or any channel can run, the system must be
bootstrapped: database opened, tables created, mandatory souls ensured, default schedules seeded,
and secrets loaded into the runtime environment. This happens from the application entry flow
(`src/index.ts` plus startup helpers), runs once at startup, and is not a reusable layer of its
own. Every layer depends on bootstrap having completed, but no layer imports from it directly.

## src/core/

The domain. Every feature is a subfolder. Each subfolder contains everything for that feature: types, logic, default content, tests. Nothing about a feature lives outside its folder.

Complex core features use explicit namespace folders so the import path itself states intent:

```text
core/<feature>/
  api/
    read/
    write/
  runtime/
  internal/
```

Meaning:

- `api/read/` — deterministic read-only primitives for cross-system consumption
- `api/write/` — intentional mutation entry points
- `runtime/` — schema init, defaults, seeds, integrity/bootstrap helpers
- `internal/` — row mappers, derivation logic, normalization, formatting, private SQL helpers

Today the explicitly namespaced core subsystems are `config`, `memory`, `pack`, `schedule`,
`secrets`, `skills`, and `souls`.

Features include (not exhaustive — grows as the system grows):

- **chat/** — mechanical turn execution pipeline. Session lifecycle, message persistence, history traversal, turn locking, token estimation. Accepts a system prompt, tools, and chat factory from above — it executes what it's given. The `CompactFn` callback allows the harness to inject compaction logic that runs inside the session lock without core knowing about the LLM call.
- **memory/** — memory storage, recall, embeddings, reconciliation.
- **souls/** — soul loading, rendering, refinement pipeline, default soul content (as .ts files).
- **config/** — typed configuration with known keys, defaults, and validation.
- **secrets/** — local secret storage, provider key management, and runtime-only value access.
- **pack/** — social bonds, contacts, identity resolution, member merging, Theory of Mind.
- **quests/** — unified task/event/calendar system, temporal awareness, quest board, FTS5 search.
- **howl/** — proactive outreach — routing metadata, origin tracking, delivery lifecycle.
- **schedule/** — job scheduling with CAS-based at-most-once locking, builtin + custom schedules, interval management.
- **skills/** — skill storage, craft/train/scout pipeline, default skills (as .ts files).

`SETTINGS` is a product umbrella, not its own `src/core/settings/` namespace. Its implementation is
split across `core/config/`, `core/secrets/`, and `core/schedule/`.

Modules that moved out of `core/`: `models/` → `lib/models/` (stateless provider registry), `service/` → `lib/service/` (OS-level daemon install), `cost/` eliminated (queries in `chat/`, pure computation in `lib/cost/`), `runs/` eliminated (merged into `chat/` sessions), `haunt/` eliminated (sessions with `purpose = 'haunt'`).

Core modules never make discretionary LLM calls. `core/chat` is a special case: its purpose IS to execute the LLM turn pipeline, but it doesn't initiate auxiliary LLM tasks (like summarization or title generation). Those live in `harness/oneshots/`.

Core modules may depend on each other when there's a genuine relationship (e.g. memory recall reads config for tuning parameters). These dependencies follow the namespace contract: default to `api/read/`, escalate to `api/write/` only when the caller is explicitly allowed to mutate, never reach into `internal/`, and never import `runtime/` during normal operation. Circular dependencies between core modules are still forbidden — if two features need each other, extract the shared concept or use a callback wired at the harness level.

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

As tool namespaces grow, the same pattern applies:

```text
tools/<namespace>/
  public/
  internal/
```

Other layers import tool factories from `public/` only.

## src/harness/

The ghost in operational form. The harness composes core modules into a working entity — the thing channels actually talk to.

**Entity.** The main composition. `createEntity(options)` produces an `Entity` with `streamTurn` and `executeTurn` methods. A channel hands it a session ID and user message; the entity handles everything: soul loading, memory recall, context assembly, tool registration, model resolution, compaction, and post-turn operations. The entity is a thin coordinator — it delegates every operation to a dedicated function, staying under 50 lines.

**Context assembly.** `assembleContext(db, workspace, soulId?)` builds the system prompt: rendered soul (identity, essence, traits), environment (current date), skill index (non-warden/chamberlain), and tool guidance. Fully static — no automatic memory injection. Persistence access is explicit through warden delegation.

**Oneshots.** `harness/oneshots/` contains fine-tuned, single-purpose LLM calls for semantic tasks that pure code can't handle: title generation, compaction summarization, and (future) classification, extraction, and routing. Each oneshot is individually tuned with its own system prompt, model parameters, and token limits. Use them liberally — ad-hoc LLM calls are an unfair advantage of an AI-first system.

**Orchestration (future).** Complex multi-step operations like haunting, training, and delegation will live in the harness as orchestration modules that compose multiple core operations and oneshots into coherent workflows.

As harness complexity grows, it follows the same naming discipline:

```text
harness/
  public/
  flows/
  prompts/
  internal/
```

Channels should prefer `harness/public/**`. Prompt builders and internal wiring stay out of their reach.

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

Channels may import `core` read APIs for deterministic inspection surfaces, but they never import `tools/` directly and should prefer `harness/public/**` for entity-driven behavior.

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

**Each feature owns its tables.** `core/chat/` creates and queries the `sessions` and `messages` tables (including cost aggregation queries). `core/memory/` creates and queries the `memories` table. `core/pack/` owns `pack_members`, `pack_interactions`, and `pack_contacts`. `core/schedule/` owns the `schedules` table. Schema creation, queries, migrations — all live inside the feature folder. Runtime table setup belongs under `runtime/`; operational queries and mutations are exposed through `api/read/` and `api/write/`; private SQL helpers stay in `internal/`. No ORM, no query builder, no abstraction layer. Hand-tuned SQL, unit-tested.

**SQL belongs in core and lib.** The architectural target is that SQL statements (`.prepare()`,
`.exec()`, raw `SELECT`/`INSERT`/`UPDATE`/`DELETE`) live only inside `core/` and `lib/`. Layers
above core should access data exclusively through approved `api/read/` and `api/write/` surfaces,
never by reaching into `internal/` or writing new SQL themselves. A small number of older
exceptions may still exist outside `core/`/`lib/`; they are technical debt to remove, not a valid
pattern to copy.

**Testing:** `lib/` also provides a test database connection that returns an in-memory (`:memory:`) SQLite instance instead of a WAL-mode on-disk file. Fast, isolated, throwaway. Every feature's tests use this — no test ever touches a real database file. Network calls are mocked — no test ever makes a real HTTP request or LLM API call.

**Why this works:** SQLite is sequential and synchronous. Even when multiple channels or concurrent
actions are in play, the database serializes writes and gives the codebase a simple consistency
model. Higher-level features may still need explicit claim/lock protocols for coordination (for
example scheduled jobs), but they do not need distributed systems machinery. This is a feature, not
a limitation — it means each feature module can write straightforward SQL against one shared local
store.

## System Decisions

Concrete decisions that apply across the codebase. When in doubt, these are authoritative.

- **ESM only.** No CJS anywhere in application code.
- **Node 24+.** Native TypeScript type stripping, `node:sqlite` without flags. No transpiler needed to run source or tests.
- **`.ts` extensions in imports.** Enables both esbuild bundling and Node's native TS execution. `allowImportingTsExtensions` in tsconfig.
- **`node:sqlite` for all persistence.** One database file. Dynamically imported always. Connection managed by `lib/`, tables owned by features.
- **Timestamps are Unix milliseconds (INTEGER).** `Date.now()` everywhere. Compact, fast comparisons, native SQLite sorting. Human-readable formatting is a channel concern.
- **IDs are INTEGER PRIMARY KEY.** SQLite autoincrement. Simple, fast, zero coordination. Sortable by insertion order. External references use session keys (e.g. `web:chat:123`, `telegram:456`).
- **Secrets never enter conversation context.** Stored locally, accessed by runtime-only secret
  readers and the `secrets` tool surfaces, injected into execution when needed, but never included
  in messages sent to the LLM.
- **Default content (souls, skills) ships as TypeScript.** Bundled into the artifact. Written to disk on first run (`init`), then owned by the user.
- **`citty` for CLI.** Subcommand routing, auto-generated help, error handling. Zero dependencies, built on `node:util.parseArgs`.
- **`chatoyant` is the LLM abstraction.** Provider-agnostic. No direct HTTP calls to model APIs.
- **`grammY` for Telegram.** Long-polling, offline catch-up.
- **Preact for web client.** TSX components, Bootstrap CSS, client-side routing. Bundled into the server as a text asset.
- **`marked` for markdown rendering** in channels that display rich text.
