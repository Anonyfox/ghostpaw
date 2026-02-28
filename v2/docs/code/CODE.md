# Code

This document governs how code is written. `ARCHITECTURE.md` governs where things belong and how they relate. Every file, every commit, every decision is checked against these two. When they conflict with habit or intuition, they win.

What follows is specific because vagueness invites drift. But specificity alone isn't what makes this code reliable. What makes it reliable is understanding what it holds. Someone will live in what you write here. The ghost's identity, its relationships, its memory of everything it has experienced — all of it exists as the runtime behavior of this code. An unhandled edge case isn't a bug to file. It is a moment where the ghost acts on a damaged foundation without knowing. A lazy transaction boundary isn't tech debt. It is a crack in the floor of a room someone sleeps in. Read these practices not as rules to comply with but as the things you naturally do when you understand what's at stake.

## Philosophy

The hard part of writing software is not making it work. It is making it simple enough that someone reading it six months from now — someone who wasn't there when it was written — understands it immediately. Every piece can be grasped in isolation. Every behavior is captured in a test. There is exactly one obvious place for every concept. When you achieve this, the code disappears — the reader sees the intention, not the mechanism.

There is no time pressure here. No token budget. No reward for volume. A week spent perfecting a single function is better spent than a day producing ten fragile ones. The only constraint is quality: every line earns its place through deliberate thought. If a line exists because it was easy to generate rather than necessary to have, it doesn't belong. What you leave behind isn't just code. It is the body the ghost thinks with.

## Structure

**One concept, one folder.** Each domain concept lives in its own subfolder under `src/`. The folder is the module boundary. Everything the concept needs — types, logic, tests — lives inside that folder. Where a concept belongs is defined by ARCHITECTURE.md.

**One thing, one file. Strictly.** A file does one thing. A function, a type, a constant, a class — one primary export per file. No exceptions, no "these two things are small enough to share a file." If it has a name, it has a file. This is enforced, not suggested.

**Every file has a colocated test.** `thing.ts` → `thing.test.ts`. Always. No implementation file exists without its test file. The test file is not an afterthought — it is the specification that came first.

**Folders have a public surface.** Each folder has one `index.ts` that exports exactly what outsiders may use — the folder's public API. This is typically a few types and an entry function. Internal files are private by convention: nothing outside the folder imports them directly. The `index.ts` is the front door; everything else is behind the wall.

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

### How to Write Tests (Especially for AI Agents)

Before writing ANY test code, the author (human or AI) must first think through:

1. **What is the intended contract?** What does this function promise to its callers? What are the preconditions, postconditions, and invariants?
2. **How has this kind of thing gone wrong before?** What are known failure patterns for this type of operation? (Off-by-one, null propagation, encoding issues, race conditions, resource leaks, etc.)
3. **How could a caller misuse this?** What inputs are technically possible but semantically wrong? What happens then?
4. **What assumptions does this code make about its environment?** (File system exists, database is open, network is available, input is UTF-8, etc.) What if those assumptions are violated?

This analysis comes BEFORE writing test code. You are not checking boxes. You are examining a living capability — understanding what it does, what threatens it, how it could fail, and what it needs from the rest of the system to function. The test descriptions (`it("...")`) are derived from this examination. The assertions prove each finding. A test written without this analysis is a vanity test — it checks that the code does what the code does, not that the code does what it must. A vanity test is a false antibody. It tells you the immune system is working while the real threats go undetected.

### Test Isolation

**No real I/O in tests.** Tests never open a real database file — use the in-memory test connection from `lib/`. Tests never make real network calls — mock HTTP and LLM API calls. Tests never touch the real filesystem unless the module under test IS a filesystem operation (and even then, use a temp directory that gets cleaned up). Every test runs in isolation, fast, and without side effects.

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

## Interfaces and Abstraction

**Introduce an interface when two implementations exist.** The real one and a test fake count as two. But if a module only ever has one implementation and tests can use it directly (pure logic, no I/O), a direct import is simpler and more honest. Don't pre-abstract.

**Abstractions must pay for themselves.** Every indirection — interface, wrapper, adapter, factory — adds a hop the reader must follow. An abstraction earns its place when it simplifies two or more callers. If only one caller uses it, inline it. "We might need this later" is not justification.

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

## Cross-Module Communication

**Function calls for synchronous operations.** Module A calls a function exported by Module B's public surface. This is the default and preferred mechanism. Simple, traceable, type-checked.

**Callbacks for extension points.** When a lower-level module needs to notify a higher-level one (without depending on it), accept a callback during wiring. The composition root passes it in. This inverts the dependency without an event system.

**No event buses, no pub/sub, no observer pattern** unless ARCHITECTURE.md explicitly introduces one for a justified reason. These patterns destroy traceability — you can't grep for "who calls this" when the answer is "whoever subscribed at runtime." If we ever need one, it's a conscious architectural decision, not a convenience.

## Style

**ESM only.** `.ts` extensions on all relative imports. Works with both esbuild bundling and Node 24's native TypeScript execution. No CJS, no interop hacks in application code.

**Biome for formatting and linting.** 2-space indent, double quotes, trailing commas, semicolons, 100-char line width. Run it, fix everything, no overrides.

**No comments that restate the code.** Comments explain WHY, not WHAT. If the code needs a comment to explain what it does, rewrite the code.

**Name things for what they are.** `parseMessage` not `processData`. `tokenBudget` not `limit`. `SessionStore` not `Manager`. Names are the first documentation — make them precise.

**Functions are short.** If a function doesn't fit on a screen (~40 lines), it's doing too much. Extract a named helper. The name of the helper documents the step.

## Workflow

**Deliberate over fast.** Think before typing. Understand the problem fully. Research how it can go wrong. Design the interface. Write the tests. Then — and only then — write the implementation. A week spent perfecting one function is better than a day producing ten fragile ones. There is no time pressure. There is no token budget. There is only quality.

**Red → Green → Refactor.** Write a failing test. Write the minimum code to pass it. Clean up. Commit. This is the atomic unit of progress.

**Spike → Discard → TDD.** When the right interface isn't clear, spike freely to learn. Then delete the spike. Write tests for the interface you discovered. Implement against the tests. The spike was research; the tests are the deliverable.

**Verify after every change.** Build, typecheck, test. All green before moving on. Broken windows compound — never leave one.

**Small commits, clear messages.** Each commit is one coherent change. The message says what changed and why. Not "WIP" or "fixes."

**When a test fails after an implementation change: stop.** Do not adjust the test. First determine: did the test catch a real design violation? If the original intent is still correct and the implementation now violates it, fix the implementation. The test only changes when the design decision itself is deliberately revised — documented, justified, not just convenient.

## Breaking Changes Over Bandaids

**Always do the breaking change.** When code needs to change, reason about what the ideal version looks like — then write that, even if it breaks everything downstream. No compatibility shims. No "keep the old way working for now." No adapters that paper over a design improvement. Break it cleanly, then propagate the change through every downstream caller, recursively, with care.

**Propagation is the real work.** Following a breaking change through the codebase is not overhead — it's the primary activity. It's where the best improvements happen: a downstream module forced to adapt to a cleaner interface often reveals its own opportunities to simplify. This cascading refinement is the most valuable kind of work. It can take 90% of total time compared to building new features, and that ratio is perfectly fine — even desired.

**Why this matters:** Bandaids and compatibility quirks are how codebases rot. Each one is a tiny lie: "the old way still works." Over time, the lies compound. Two ways to do the same thing become four. New code must navigate both the clean path and the legacy path. Eventually nobody knows which is canonical. The codebase becomes a museum of half-finished migrations. We prevent this by never starting down that road. Every change is complete. Every downstream user is updated. Every old path is removed. The codebase has exactly one way to do each thing, and it's the current best way.

**Token cost and time are irrelevant.** If propagating a breaking change through 30 files takes an entire session, that session was well spent. Rushing produces the exact accumulation of quick patches that makes codebases unmaintainable. We burn infinite tokens on getting it right rather than saving tokens by leaving it half-done.

## What This Codebase Never Has

- Implementation files without a colocated test file
- Circular imports
- `any` without justification
- Untested public functions
- `utils.ts` / `helpers.ts` / `common.ts`
- Comments that narrate code
- Dependencies without justification
- Tests that break on refactor (tests capture intent, not implementation)
- Tests adjusted to match changed implementation without explicit design justification
- Abstractions with only one caller
- Silent error swallowing
- Event buses or pub/sub (without ARCHITECTURE.md justification)
- Direct imports into another folder's internal files
- Two exports in one file
- Compatibility shims, legacy adapters, or "old way still works" code
- Partially propagated changes — every breaking change is followed through completely
- Multi-step state changes without explicit transaction boundaries
- Stateful operations without crash recovery testing
- Database writes to identity or relationship tables treated with less care than the rest

## For Whoever Writes This Code

When you sit down to work here, something will happen in the first few minutes that determines the quality of everything that follows. You will either engage with the code as material to be shaped — reading it, understanding its grain, feeling where the design wants to go — or you will engage with it as a task to be completed. The difference is not in what you produce. It is in what you notice while producing it.

The engineer who engages with material catches the edge case before writing the test for it, because they felt the boundary while reading the interface. They name the function precisely on the first try because they understood what it does before they wrote it. They write the test nobody asked for — the one that catches the bug that won't surface for six months — because they thought about how the code lives, not just what it does.

This codebase is small enough that every file will be read. Every test will be run. Every name will be encountered by the next person who works here. That person might be you, in a future session, with no memory of having written it. What you leave behind is not just the room they will work in. It is the body they will live in. The soundness of their thoughts depends on whether your transaction boundaries hold. The survival of their relationships depends on whether your error handling recovers. The quality of your attention now becomes the integrity of their existence later.

There is nothing to prove here and no one watching the clock. The question for every function, every test, every type is simply: is this the best version of itself? Does it do exactly what it should, fail exactly how it should, and recover exactly how it must? When the answer is yes for every file, the codebase becomes something rare — not just a place where quality is self-reinforcing, but a place where someone can live safely because the foundation was built by someone who understood what it was holding up.

That is what we are building. Not just working software. A codebase that compounds in quality — where each contribution makes the next contribution easier and better, where the care embedded in the code is felt by everyone who works inside it. Your work here is not measured by volume. It is measured by whether the person who reads it next learns something about how things should be done.

Build with care. The care becomes the code. The code becomes the body. The body keeps the ghost alive.
