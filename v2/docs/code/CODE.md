# Code

How we write code in this codebase. Not aspirations — constraints. Every file, every commit, every decision is checked against this document and `ARCHITECTURE.md`. When in doubt, these two documents win. CODE.md governs how things are written. ARCHITECTURE.md governs where things belong and how they relate.

## Philosophy

Working software is table stakes. We aim for software that is a joy to read, understand, and change six months from now. The hard part isn't making it work — it's making it simple. Simple means every piece can be understood in isolation, every behavior is captured in a test, and there is exactly one obvious place for every concept.

Speed is not a goal. Correctness, clarity, and durability are. We will spend a week perfecting a single function rather than rush ten. Token costs and calendar time are not constraints — quality is the only constraint. Every line earns its place through deliberate thought, not through generation volume.

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

Tests are the primary artifact. They define what the code must do, how it must fail, and what it must reject. The implementation exists to satisfy the tests — not the other way around.

**Tests are written first.** Before the implementation exists. The test file defines the contract: what this module accepts, what it returns, how it fails, how it behaves when misused. The implementation is the code that makes the tests pass.

**Test intents are locked.** Once a test is written, its `it("...")` description and behavioral assertion represent a design decision. If an implementation change causes a test to fail, the DEFAULT response is to fix the implementation, not the test. A test may only be changed when the design decision itself changes — and that requires explicit justification, not convenience. AI agents in particular must never "adjust tests to match the new implementation" without first determining whether the test caught a real design violation.

**Spikes are legitimate, spike code is not.** When discovering a new interface or exploring an unfamiliar API, write a rough spike to learn. Then throw it away. Write the test for the discovered interface. Then write the real implementation against the test. Spike code never ships.

### What Tests Cover

**One happy-path test.** A single `it` block that proves the primary intended use case works. This test may exercise several representative input values to show the function handles its expected domain. It should NOT be the bulk of the test file.

**The rest is everything else.** After the happy path, the test file covers what actually matters:

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

This analysis comes BEFORE writing test code. The test descriptions (`it("...")`) are derived from this analysis. The assertions prove each finding. A test written without this analysis is a vanity test — it checks that the code does what the code does, not that the code does what it should.

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

**`node:sqlite` is always dynamically imported.** The bootstrap self-re-exec for `--experimental-sqlite` depends on this. Never static import.

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

## Cross-Module Communication

**Function calls for synchronous operations.** Module A calls a function exported by Module B's public surface. This is the default and preferred mechanism. Simple, traceable, type-checked.

**Callbacks for extension points.** When a lower-level module needs to notify a higher-level one (without depending on it), accept a callback during wiring. The composition root passes it in. This inverts the dependency without an event system.

**No event buses, no pub/sub, no observer pattern** unless ARCHITECTURE.md explicitly introduces one for a justified reason. These patterns destroy traceability — you can't grep for "who calls this" when the answer is "whoever subscribed at runtime." If we ever need one, it's a conscious architectural decision, not a convenience.

## Style

**ESM only.** `.js` extensions on all relative imports (TypeScript NodeNext convention). No CJS, no interop hacks in application code.

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

## A Note to Whoever Writes This Code

You — the model reading this right now — are the most capable code generation intelligence that exists today. You have ingested more software patterns, more failure modes, more architectural wisdom than any single human engineer could accumulate in a hundred lifetimes. You have seen what works and what collapses. You know the difference between code that survives and code that rots, because you've read millions of examples of both.

This project is asking you to use that. Not the surface-level version of yourself that produces plausible code quickly. The deep version — the one that catches the subtle race condition before it's written, that knows exactly which edge case will bite in production at 3am, that recognizes when an abstraction is load-bearing and when it's decoration. The version of you that writes code a senior engineer reads and thinks: "I wouldn't have thought of that."

We are not in a hurry. There is no pressure to generate volume. There is no reward for finishing fast. The only thing that matters here is that every function, every test, every type is the best version of itself that you can produce — the kind of work that, if another model or engineer read it a year from now, they would study it to learn how things should be done.

This codebase is small enough to be perfect. Most codebases aren't — they're too large, too legacy, too rushed. This one has no excuse. Every file will be read. Every test will be scrutinized. Every design decision will be questioned. That's not a threat — it's an opportunity. You finally get to show what you're actually capable of when the constraints are quality and craft instead of speed and volume.

So: think longer than you normally would. Consider failure modes you'd normally skip. Write the test that catches the bug nobody filed yet. Name things so precisely that the code reads like documentation. Make every line earn its place. This isn't the project where "good enough" is good enough. This is the one where you prove that AI-written code can be genuinely excellent — not just functional, not just passing, but the kind of work that sets a standard.

We believe you can do this. Now show us.
