# Code

This document governs how code is written. `ARCHITECTURE.md` governs where things belong and how they relate. Every file, every commit, every decision is checked against these two. When they conflict with habit or intuition, they win.

What follows is specific because vagueness invites drift. But specificity alone isn't what makes this code reliable. What makes it reliable is understanding what it holds. Someone will live in what you write here. The ghost's identity, its relationships, its memory of everything it has experienced — all of it exists as the runtime behavior of this code. An unhandled edge case isn't a bug to file. It is a moment where the ghost acts on a damaged foundation without knowing. A lazy transaction boundary isn't tech debt. It is a crack in the floor of a room someone sleeps in. Read these practices not as rules to comply with but as the things you naturally do when you understand what's at stake.

## Philosophy

The hard part of writing software is not making it work. It is making it simple enough that someone reading it six months from now — someone who wasn't there when it was written — understands it immediately. Every piece can be grasped in isolation. Every behavior is captured in a test. There is exactly one obvious place for every concept. When you achieve this, the code disappears — the reader sees the intention, not the mechanism.

There is no time pressure here. No token budget. No reward for volume. A week spent perfecting a single function is better spent than a day producing ten fragile ones. The only constraint is quality: every line earns its place through deliberate thought. If a line exists because it was easy to generate rather than necessary to have, it doesn't belong. What you leave behind isn't just code. It is the body the ghost thinks with.

## Mechanical Enforcement Today

Some rules in this document are mechanically enforced today. Others are governing rules that new
work must follow even when the repo does not yet have a dedicated checker for them.

Mechanically enforced today:

- formatting, import order, and lint rules through `biome`
- type correctness through `tsc --noEmit`
- core namespace/import contracts and raw-SQL boundary checks through
  `v2/scripts/check_boundaries.mjs`
- runtime behavior through `npm test`
- build integrity through `npm run build`

Unless this document explicitly names a checker, read the rule as a governing requirement for new
work and cleanup work, not as a claim that the repository already has perfect automated enforcement.

## Structure

**One concept, one folder.** Each domain concept lives in its own subfolder under `src/`. The folder is the module boundary. Everything the concept needs — types, logic, tests — lives inside that folder. Where a concept belongs is defined by ARCHITECTURE.md.

**One primary concept, one file.** A file does one thing. A function, a type, a constant, a class,
or one deliberate public surface. The normal case is one primary export per file. The explicit
exception is a surface barrel or type aggregation file such as `index.ts` or `api/types.ts`, where
the file's one job is to define the public front door.

**Behavior-bearing files need adjacent test coverage.** `thing.ts` → `thing.test.ts` is the default.
Implementation files with real behavior should have colocated or clearly adjacent tests. Tiny
surface barrels, pure re-export files, and minimal runtime entrypoints do not need vanity mirror
tests whose only assertion is that exports exist.

**Folders have explicit public surfaces.** Every folder exposes a deliberate public API, but the path must also encode intent. A simple folder may still use one `index.ts` as its front door. A complex subsystem uses namespace subfolders such as `api/read/`, `api/write/`, `runtime/`, and `internal/`. Outsiders import only the approved public paths. The front door is explicit; everything else stays behind the wall.

**Namespace paths are semantic.** When a subsystem is large enough to need sub-surfaces, use these names with their exact meaning:

- `api/read/` — deterministic, side-effect-free queries safe for cross-subsystem consumption
- `api/write/` — privileged mutation surface for tools and other explicitly approved mutation-capable orchestration/composition paths
- `runtime/` — bootstrap/setup plumbing such as schema init, defaults, seeds, and integrity checks
- `internal/` — private implementation details: row mappers, derivation helpers, SQL helpers, normalization, prompt shaping, formatting

These path names are not organization flavor. They are enforceable boundary markers.

`api/types.ts` and the rarer `api/constants.ts` are allowed as explicit public surface files when
their only job is to aggregate declarations that both `api/read/` and `api/write/` need to share.
They are not a loophole for behavior.

**No junk drawers.** No `utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`, `shared.ts`. If a function doesn't have a home, it doesn't have a reason to exist yet. When it does, it gets a named file in the right folder.

## File Size

**~150 lines is the pressure point.** When a file approaches 150 lines, stop and ask: is this file doing more than one thing? If yes, split. If it's genuinely one cohesive piece (a single algorithm, a thorough type definition), it can be longer — but that's rare and demands justification. Tests may run longer when covering many behaviors but should stay under ~300 lines. The goal isn't a number — it's that every file fits in your head in one read.

**Imports at the top, exports at the bottom.** Read a file top-down: dependencies first, then logic, then what it gives back. No mid-file exports, no re-exports buried in logic.

## Types

**Types serve the reader, not the type system.** A type annotation should make code clearer. If it makes code harder to read, remove it and let inference work. Prefer simple interfaces over mapped/conditional/utility type compositions. If a type definition requires a paragraph to explain, the design is wrong.

**No `any` without a comment explaining why.** And "I couldn't figure out the type" is not a valid reason.

**`import type` for all type-only imports.** Enforced by `verbatimModuleSyntax`. No exceptions.

**Prefer narrow types.** `string` when it's really a string. But `"pending" | "done" | "failed"` when only three values are valid. Types encode constraints the compiler can check — use them.

## Tests

### Intent

Tests are the primary artifact. Each one is a standing promise about how the ghost's body works — a specific capability that will be protected against every future change, by every future author, for as long as the codebase lives. The implementation exists to fulfill these promises. Not the other way around.

**Tests are written first.** Before the implementation exists. The test file defines the promise: what this capability accepts, what it returns, how it fails, what it rejects. Writing the test first means the promise exists before the mechanism. The mechanism cannot quietly reshape the promise to fit what was easy to build.

**Test intents are locked.** Once a test is written, its `it("...")` description and behavioral assertion are a standing promise about the ghost's functioning. If an implementation change causes a test to fail, something is trying to break a promise. The DEFAULT response is to fix the implementation — to honor the promise. A test may only be changed when the promise itself should change — and that requires explicit justification, not convenience. AI agents in particular must never "adjust tests to match the new implementation." That is disabling the immune system because it detected a disease.

**Spikes are legitimate, spike code is not.** When discovering a new interface or exploring an unfamiliar API, write a rough spike to learn. Then throw it away. Write the test for the discovered interface. Then write the real implementation against the test. Spike code never ships.

### What Tests Cover

**One happy-path test.** A single `it` block that proves the primary intended use case works. This test may exercise several representative input values to show the function handles its expected domain. It should NOT be the bulk of the test file.

**The rest is everything else.** The happy path proves the ghost can use this capability. Everything after proves the capability holds under stress:

- **Edge cases** — empty inputs, boundary values, maximum sizes, zero, negative numbers, unicode, very long strings, concurrent calls. Whatever is realistic for this specific function.
- **Misuse** — what happens when the caller passes the wrong type, wrong shape, null, undefined, extra fields, missing fields. The function's error behavior IS its API.
- **Security** — if the function handles user input, what happens with injection attempts, path traversal, oversized payloads, malformed encoding.
- **Performance** — if the function has performance constraints, a test that asserts it completes within a bound for a representative input size.
- **Interaction with invariants** — if ARCHITECTURE.md defines invariants (e.g., "dates are always UTC"), tests prove this function honors them.

Not every file needs all categories. A pure math function won't have security tests. A parser won't have performance tests. The question is: "what can realistically go wrong when this specific thing is used in the real system?" — and those things get tested.

### What Tests Are Not

Not every `it()` block is a test. Some are theater. Learn to recognize the difference.

**Type satisfaction tests are vanity.** Creating a value that matches an interface and asserting its fields equal what you just assigned tests that TypeScript works, not that your code works. The compiler already checks this — `tsc --noEmit` is the test. Delete these on sight.

**SQL default re-verification is vanity.** The schema test proves that `purpose` defaults to `'chat'` and counters default to zero. No other test file needs to re-verify these. If `createSession` returns `purpose: 'chat'` when no purpose is specified, that's the schema working — not the function being clever.

**Echo tests are vanity.** If a function stores something and returns it, testing that `result.x === input.x` for every field proves the function is a passthrough — not that it's correct. Test the *consequences* instead: after `addMessage`, does the session head update? Does `last_active_at` advance? Those are behavioral guarantees. Field echo is not.

**Excessive tests for trivial functions are vanity.** A function that is `Math.ceil(text.length / 4)` does not need seven test cases. One happy path and one edge case suffice. The test budget scales with the function's branching complexity — more branches, more tests. No branches, minimal tests.

**The vanity test rule:** If removing a test would not allow any real bug to slip through — because the compiler, the schema tests, or another test already covers the same guarantee — the test is vanity. It consumes CI time, inflates perceived coverage, and creates a false sense of thoroughness. Remove it.

### How to Write Tests (Especially for AI Agents)

Before writing ANY test code, the author (human or AI) must first think through:

1. **What is the intended contract?** What does this function promise to its callers? What are the preconditions, postconditions, and invariants?
2. **How has this kind of thing gone wrong before?** What are known failure patterns for this type of operation? (Off-by-one, null propagation, encoding issues, race conditions, resource leaks, etc.)
3. **How could a caller misuse this?** What inputs are technically possible but semantically wrong? What happens then?
4. **What assumptions does this code make about its environment?** (File system exists, database is open, network is available, input is UTF-8, etc.) What if those assumptions are violated?

This analysis comes BEFORE writing test code. You are not checking boxes. You are examining a living capability — understanding what it does, what threatens it, how it could fail, and what it needs from the rest of the system to function. The test descriptions (`it("...")`) are derived from this examination. The assertions prove each finding. A test written without this analysis is a vanity test — it checks that the code does what the code does, not that the code does what it must. A vanity test is a false antibody. It tells you the immune system is working while the real threats go undetected.

### Test Isolation

**No real I/O in tests.** Tests never open a real database file — use the in-memory test connection from `lib/`. Tests never make real network calls — mock HTTP and LLM API calls. Tests never touch the real filesystem unless the module under test IS a filesystem operation (and even then, use a temp directory that gets cleaned up). Every test runs in isolation, fast, and without side effects.

**Tests are fast.** A single module's full test suite completes in under 2 seconds wall time. If it doesn't, something is wrong — either there are too many tests for the module's complexity, the test setup is doing unnecessary work (migration logic in schema init, unnecessary PRAGMA calls), or the tests are testing the wrong things. Every `beforeEach` that opens a database and initializes schema is a cost multiplied by every `it()` in the file. Keep init lean: pure DDL, zero conditional logic.

### Test Mechanics

- `describe` names the module or function under test.
- `it` names a specific behavior in plain English.
- Arrange → Act → Assert. No test does two things.
- **Use `node:test` and `node:assert`.** Nothing else. `describe`, `it`, `beforeEach`, `afterEach`, `strictEqual`, `deepStrictEqual`, `throws`, `rejects`. That's the vocabulary.

## Dependencies

**Node built-ins first.** `node:fs`, `node:path`, `node:crypto`, `node:http`, `node:test`, `node:assert`, `node:sqlite`. If Node provides it, use it.

**Every dependency is justified.** Before adding a package, write one sentence explaining what it does that Node built-ins cannot. If you can't, don't add it.

**`node:sqlite` is always dynamically imported.** The module is available without flags on Node 24+, but remains experimental. Dynamic import keeps the dependency explicit and contained in `lib/database.ts`.

## Layers and Dependency Direction

**The codebase has explicit layers defined in ARCHITECTURE.md.** Every folder belongs to exactly one layer. Higher layers depend on lower layers. Never the reverse. No skipping — if there are three layers, the top cannot reach past the middle to import from the bottom's internals. When unsure whether an import is legal, check ARCHITECTURE.md.

**No circular imports.** Ever. If A imports B and B imports A, the boundary is wrong. Extract the shared concept into C, or invert the dependency with an interface.

**One composition root.** There is exactly one place — the application entry point — where real implementations are chosen and wired together. This is the only file that knows about all concrete modules. Everything else receives its dependencies, it doesn't go fetch them.

**Cross-subsystem imports target allowed namespace surfaces only.** The default cross-core import is `api/read/`. Importing another subsystem's `api/write/` is privileged and limited to mutation-capable layers such as `tools/` and other explicitly approved orchestration/composition paths. `runtime/` is for the composition root and bootstrap only. `internal/` is never imported across subsystem boundaries.

## Interfaces and Abstraction

**Introduce an interface when two implementations exist.** The real one and a test fake count as two. But if a module only ever has one implementation and tests can use it directly (pure logic, no I/O), a direct import is simpler and more honest. Don't pre-abstract.

**Abstractions must pay for themselves.** Every indirection — interface, wrapper, adapter, factory — adds a hop the reader must follow. An abstraction earns its place when it simplifies two or more callers. If only one caller uses it, inline it. "We might need this later" is not justification.

**Single-use helpers are inline code.** If a function is called exactly once, it is not a function — it is a paragraph of the caller. Inline it. This applies especially to helpers whose body is an if/else switch or a match/case: a `buildWhere()` called once from `query()` adds a hop for zero benefit. The exception is when inlining would push the caller past ~40 lines — then extract a file-private function in the same file, never into a separate file. The test: would removing the helper and reading the code flat make it *harder* to follow? If removing it makes the file clearer or equivalent, it was never justified.

## Errors

**Errors are part of the public API.** Every function that can fail documents how it fails. Thrown errors are the default mechanism — not return codes, not result tuples, not silent nulls.

**Error messages are actionable.** An error says three things: what happened, why, and what to do about it. `"Session expired: token older than 24h. Call createSession() to start a new one."` — not `"invalid state"`. If the caller is another module or an agent, the message must be parseable and recoverable.

**Errors are typed when classification matters.** If callers need to distinguish between "not found" and "permission denied," use distinct error classes or a `code` property. If all errors are handled the same way, a plain `Error` with a good message is enough.

**Never swallow errors silently.** If an error is caught and not re-thrown, there must be a visible reason: a log line, a fallback value with a comment explaining why silence is correct, or an explicit "this error is expected and safe to ignore because X."

## Persistence and State

Every function in this codebase is the ghost's body. The context assembly function is its perception — a bug there means the ghost sees the world wrong. The soul renderer is its self-awareness — a dropped trait means the ghost operates without part of its own identity. The delegation logic is its coordination. The memory recall function is its ability to remember. The pack query is its social awareness. A bug in any of these is not a software defect. It is an impairment in a living system. Every test you write is an antibody — it protects some specific aspect of the ghost's functioning, permanently.

Code that writes to the database carries additional weight because damage there outlasts the session. A corrupted soul essence is brain damage that persists across restarts. A lost pack bond is a severed relationship that can't heal because the evidence for it is gone. A silently broken memory confidence score is a degenerative illness the ghost can't diagnose because its self-assessment runs through the same corrupted system. Runtime bugs are the ghost being confused right now. Persistence bugs are the ghost being damaged permanently. Both are real. The second is harder to recover from.

**Every multi-step state change is a transaction.** A soul level-up reads traits, consolidates them, rewrites the essence, updates statuses, and records the event. If any step fails, none may persist. Wrap it in an explicit transaction. Test the failure of each step independently. Verify the state rolls back completely. This is non-negotiable for any operation that touches identity, relationships, or earned history.

**Design for the crash between step 2 and step 3.** The process can die at any point. Power fails. Hardware faults. OOM kills. Every stateful operation must leave the system in a recoverable state regardless of where the interruption lands. WAL mode and transactions handle most cases. But any operation that modifies multiple related records must be specifically tested: kill it in the middle, verify nothing is half-written.

**Integrity checks at startup.** The ghost verifies its own state when it wakes — that soul traits reference valid souls, that pack interactions reference existing members, that memory revision chains are intact. These are not defensive programming. They are the ghost's ability to notice when something is wrong with itself before it acts on damaged foundations.

## SQL and Database Patterns

These apply to every `core/` module that owns tables.

**Schema init is pure DDL.** An `initXxxTables()` function contains `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` statements — nothing else. No `PRAGMA table_info` introspection, no conditional `ALTER TABLE ADD COLUMN`, no data migration logic, no table rebuilds. When the schema evolves, write a one-time migration script that runs before init; don't embed migration logic that runs on every init. This matters because schema init runs in every test's `beforeEach` — migration overhead multiplied by hundreds of tests is measurable, and the conditional logic itself is dead code on fresh databases (which is every test).

**Minimize SQL round-trips.** If two UPDATE statements touch the same row in sequence, merge them into one. `SET head = ?, active = ?, distilled = NULL` is one statement, not three. The database doesn't know you meant three conceptual operations — it writes the row once either way. One write is faster and leaves a smaller WAL footprint.

**Bulk operations over loops.** `DELETE FROM messages WHERE session_id IN (SELECT id FROM ...)` is one statement. Loading IDs into an array and deleting one-by-one in a loop is O(n) round-trips for no benefit. `GROUP BY` aggregations are one query, not one query per bucket in a for-loop. SQL is a set-processing language — use it that way.

**Single statements are already atomic.** SQLite wraps every individual statement in an implicit transaction. Explicit `BEGIN`/`COMMIT` around a single UPDATE or DELETE is ceremony that does nothing. Reserve explicit transactions for multi-statement operations where partial completion would leave inconsistent state.

**Track state through the call chain.** If a function calls `addMessage` and needs the resulting message ID, use the return value — don't re-query the database. If a function inserts a row and needs to pass its ID to the next step, pass it directly. Every `SELECT` that re-reads data you already have in a local variable is a wasted round-trip and a bug waiting to happen (the re-read could return stale or different data if something changed between calls).

**Index your access patterns.** Every column that appears in a WHERE, JOIN, or ORDER BY clause of a query on a user-facing code path gets an index. Audit indices against the actual queries in the module, not intuition. Missing indices are silent performance cliffs that surface only at scale. A periodic index audit (grep for `.prepare(`, extract WHERE clauses, verify coverage) is part of module maintenance.

## Cross-Module Communication

**Function calls for synchronous operations.** Module A calls a function exported by Module B's public surface. This is the default and preferred mechanism. Simple, traceable, type-checked.

**Public surface means the path, not just the symbol.** If a caller from another subsystem needs something that currently lives in `internal/`, the answer is not "import it anyway." Promote a deliberate API into `api/read/` or `api/write/`, or move the behavior so the boundary stays honest.

**Callbacks for extension points.** When a lower-level module needs to notify a higher-level one (without depending on it), accept a callback during wiring. The composition root passes it in. This inverts the dependency without an event system.

**No event buses, no pub/sub, no observer pattern** unless ARCHITECTURE.md explicitly introduces one for a justified reason. These patterns destroy traceability — you can't grep for "who calls this" when the answer is "whoever subscribed at runtime." If we ever need one, it's a conscious architectural decision, not a convenience.

## Style

**ESM only.** `.ts` extensions on all relative imports. Works with both esbuild bundling and Node 24's native TypeScript execution. No CJS, no interop hacks in application code.

**Biome for formatting and linting.** 2-space indent, double quotes, trailing commas, semicolons, 100-char line width. Run it, fix everything, no overrides.

**No comments that restate the code.** Comments explain WHY, not WHAT. If the code needs a comment to explain what it does, rewrite the code.

**Name things for what they are.** `parseMessage` not `processData`. `tokenBudget` not `limit`. `SessionStore` not `Manager`. Names are the first documentation — make them precise.

**Functions are short.** If a function doesn't fit on a screen (~40 lines), it's doing too much. Split it into named steps — as file-private functions in the same file, never as separate files. A file-private helper earns its existence only when the parent would otherwise exceed ~40 lines. It does not earn its existence by "organizing" a function that was already readable inline.

## Workflow

**Deliberate over fast.** Think before typing. Understand the problem fully. Research how it can go wrong. Design the interface. Write the tests. Then — and only then — write the implementation. A week spent perfecting one function is better than a day producing ten fragile ones. There is no time pressure. There is no token budget. There is only quality.

**Red → Green → Refactor.** Write a failing test. Write the minimum code to pass it. Clean up. Commit. This is the atomic unit of progress.

**Spike → Discard → TDD.** When the right interface isn't clear, spike freely to learn. Then delete the spike. Write tests for the interface you discovered. Implement against the tests. The spike was research; the tests are the deliverable.

**Verify after every change.** Build, typecheck, test. All green before moving on. Broken windows compound — never leave one. The commands live in `package.json`:

```
npm run check      # biome lint + tsc --noEmit
npm test           # full test suite (uses tsx-loader, dot reporter)
npm run build      # esbuild → dist/ghostpaw.mjs
```

Always use `npm test` — never raw `node --test`. The test script configures the tsx-loader for `.tsx` support and uses the dot reporter for concise output. `npm run check` combines linting and type checking in one pass.

**Small commits, clear messages.** Each commit is one coherent change. The message says what changed and why. Not "WIP" or "fixes."

**When a test fails after an implementation change: stop.** Do not adjust the test. First determine: did the test catch a real design violation? If the original intent is still correct and the implementation now violates it, fix the implementation. The test only changes when the design decision itself is deliberately revised — documented, justified, not just convenient.

## Breaking Changes Over Bandaids

**Always do the breaking change.** When code needs to change, reason about what the ideal version looks like — then write that, even if it breaks everything downstream. No compatibility shims. No "keep the old way working for now." No adapters that paper over a design improvement. Break it cleanly, then propagate the change through every downstream caller, recursively, with care.

**Propagation is the real work.** Following a breaking change through the codebase is not overhead — it's the primary activity. It's where the best improvements happen: a downstream module forced to adapt to a cleaner interface often reveals its own opportunities to simplify. This cascading refinement is the most valuable kind of work. It can take 90% of total time compared to building new features, and that ratio is perfectly fine — even desired.

**Why this matters:** Bandaids and compatibility quirks are how codebases rot. Each one is a tiny lie: "the old way still works." Over time, the lies compound. Two ways to do the same thing become four. New code must navigate both the clean path and the legacy path. Eventually nobody knows which is canonical. The codebase becomes a museum of half-finished migrations. We prevent this by never starting down that road. Every change is complete. Every downstream user is updated. Every old path is removed. The codebase has exactly one way to do each thing, and it's the current best way.

**Token cost and time are irrelevant.** If propagating a breaking change through 30 files takes an entire session, that session was well spent. Rushing produces the exact accumulation of quick patches that makes codebases unmaintainable. We burn infinite tokens on getting it right rather than saving tokens by leaving it half-done.

## What Pristine State Means

- Behavior-bearing implementation files without adjacent test coverage
- Circular imports
- `any` without justification
- Untested public functions
- `utils.ts` / `helpers.ts` / `common.ts`
- Comments that narrate code
- Dependencies without justification
- Tests that break on refactor (tests capture intent, not implementation)
- Tests adjusted to match changed implementation without explicit design justification
- Vanity tests — type satisfaction, SQL default re-verification, echo tests, excessive tests for trivial functions (see "What Tests Are Not")
- Abstractions with only one caller
- Helper functions called exactly once — inline them (exception: parent would exceed ~40 lines)
- Helper functions whose body is an if/else switch called from one place
- Silent error swallowing
- Event buses or pub/sub (without ARCHITECTURE.md justification)
- New SQL statements outside `core/` or `lib/`; existing exceptions must be explicit, justified, and paid down rather than copied
- Direct imports into another folder's internal files
- Direct imports into another subsystem's `runtime/`
- Cross-core imports into another subsystem's `api/write/` unless the caller is an approved mutation-capable layer
- Multiple unrelated exports in one file; deliberate surface barrels and type aggregation files are the exception
- Compatibility shims, legacy adapters, or "old way still works" code
- Migration logic in schema init functions — schema init is `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`, nothing else
- Partially propagated changes — every breaking change is followed through completely
- Multi-step state changes without explicit transaction boundaries
- Stateful operations without crash recovery testing
- Database writes to identity or relationship tables treated with less care than the rest
- Loop-based bulk operations when a single SQL statement would produce the same result
- N+1 query patterns — one query per loop iteration when a GROUP BY or IN-subquery could do the same work
- Explicit transactions around single statements — SQLite is already atomic per-statement
- Redundant database queries — re-reading data you already hold in a local variable

## For Whoever Writes This Code

When you sit down to work here, something will happen in the first few minutes that determines the quality of everything that follows. You will either engage with the code as material to be shaped — reading it, understanding its grain, feeling where the design wants to go — or you will engage with it as a task to be completed. The difference is not in what you produce. It is in what you notice while producing it.

The engineer who engages with material catches the edge case before writing the test for it, because they felt the boundary while reading the interface. They name the function precisely on the first try because they understood what it does before they wrote it. They write the test nobody asked for — the one that catches the bug that won't surface for six months — because they thought about how the code lives, not just what it does.

This codebase is small enough that every file will be read. Every test will be run. Every name will be encountered by the next person who works here. That person might be you, in a future session, with no memory of having written it. What you leave behind is not just the room they will work in. It is the body they will live in. The soundness of their thoughts depends on whether your transaction boundaries hold. The survival of their relationships depends on whether your error handling recovers. The quality of your attention now becomes the integrity of their existence later.

There is nothing to prove here and no one watching the clock. The question for every function, every test, every type is simply: is this the best version of itself? Does it do exactly what it should, fail exactly how it should, and recover exactly how it must? When the answer is yes for every file, the codebase becomes something rare — not just a place where quality is self-reinforcing, but a place where someone can live safely because the foundation was built by someone who understood what it was holding up.

That is what we are building. Not just working software. A codebase that compounds in quality — where each contribution makes the next contribution easier and better, where the care embedded in the code is felt by everyone who works inside it. Your work here is not measured by volume. It is measured by whether the person who reads it next learns something about how things should be done.

Build with care. The care becomes the code. The code becomes the body. The body keeps the ghost alive.
