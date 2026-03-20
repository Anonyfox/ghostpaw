# Pain Points

What's working, what isn't, and why. Written from direct inspection of the codebase — context assembly, tool surfaces, delegation mechanics, soul essences, and the seams between them.

## The Verdict

The high-level concepts are sound and scientifically grounded: evolutionary souls, belief-based memory, relational pack bonds, temporal quest commitments, earned skills, narrative trail. Each subsystem is well-engineered internally. The problems live in the **interaction seams** — how these systems are accessed, composed, and orchestrated at runtime.

---

## Pain Point 1: The Warden is Cognitively Overloaded

**Severity: Critical**

The warden holds 23 tools across three unrelated domains:

| Domain | Tools | Concepts |
|--------|-------|----------|
| Memory | 4 | recall, remember, revise, forget; deduplication, evidence grounding, confidence decay |
| Pack | 10 | sense, meet, bond, note, link, contact_add/remove/list/lookup, merge; trust scores, interaction kinds, custom fields, directional links, patrol, search |
| Quests | 10 | list, create, update, done, turnin, accept, dismiss, subgoals, storyline_create, storyline_list; lifecycle states, RRULE, timestamps, storyline ordering |

LLM tool-use accuracy degrades significantly past ~10-12 tools. The warden is at 23, spanning domains as different as "store a belief" and "manage a recurring calendar event with RRULE" and "update a trust score on a social bond." The tool guidance in `formatToolGuidance` tries to teach all of it in ~45 lines.

**Observed symptoms:** Wrong tool selection, confused quest lifecycle transitions, neglected pack updates, memory duplicates despite the "recall before remember" instruction.

**Root cause:** Three different jobs forced into one mind.

## Pain Point 2: Delegation Translation Tax

**Severity: Critical**

Every persistence operation requires two LLM calls with a lossy translation step:

```
User speaks → Coordinator interprets → Coordinator writes task string →
Warden receives ONLY that string → Warden re-interprets → Tool calls
```

The warden's delegation session contains:
- Its soul essence + tool guidance
- A four-line delegation preamble ("Complete it thoroughly and return your result.")
- The coordinator's `task` parameter — free-form natural language

The warden does **not** see:
- The actual conversation
- The user's exact words, tone, or nuance
- Previous delegation results from the same session
- What the coordinator was thinking when it chose to delegate

The coordinator must be a perfect reporter — capturing everything the warden needs in a single `task` string while simultaneously managing a conversation. It isn't, because LLMs are bad at thorough summarization under conversational pressure.

**Observed symptoms:** Vague delegations ("note what we discussed"), warden guessing at details, pack bonds not updated because the coordinator didn't mention the person by name, quests created with wrong parameters because the coordinator's summary was imprecise.

**Root cause:** Secondhand information as the only input to persistence operations.

## Pain Point 3: The Coordinator Forgets to Delegate

**Severity: High**

The coordinator's tool guidance says:

> Delegate eagerly. When the user mentions a person, a task, a preference, or asks what you know or remember — delegate. After any substantive exchange, delegate to note what happened.

This is aspirational guidance, not operational instruction. The LLM reads "delegate eagerly" and then gets absorbed in the conversational task. This is a known pattern — LLMs prioritize immediate tasks over background maintenance instructions, especially when guidance is stated as a general principle rather than a specific trigger.

The `ask_warden` tool description is derived from the soul description + a suffix:

> Delegate to Warden. The persistence keeper — memory hygiene, pack freshness, quest reconciliation... All agent state (memory, pack, quests, storylines) is only accessible through this tool.

This tells the coordinator **what** the warden does but not **when** to delegate or **how** to formulate good task strings.

**Observed symptoms:** Conversations where interesting information is shared but never persisted. User mentions preferences, people, or tasks that never reach memory/pack/quests. Delegation happens inconsistently — sometimes after every turn, sometimes not at all in a session.

**Root cause:** No structural mechanism to ensure persistence happens; relies entirely on LLM instruction-following for a low-salience background task.

## Pain Point 4: Quest Tool Complexity

**Severity: Medium**

`quest_create` has 12 parameters. `quest_update` has 13. Many require Unix millisecond timestamps (the warden must call `datetime` first to compute them). The lifecycle has 6+ states with separate tools for transitions (`quest_done`, `quest_turnin`, `quest_accept`, `quest_dismiss`). The warden also manages `quest_subgoals` (5 actions) and storylines (create, list, position ordering).

For a delegation like "the user wants to remember to deploy by Friday," the warden must:
1. Decide quest vs memory (this is a commitment, not a belief — quest)
2. Choose status (`accepted` vs `offered`)
3. Call `datetime` to get current time, compute Friday as Unix ms
4. Call `quest_create` with the right parameters
5. Decide on priority, tags, storyline

That's 3+ tool calls and multiple judgment decisions from a single-sentence delegation.

**Observed symptoms:** Quests created with wrong status, missing due dates, confusion between `done` and `turnin`, timestamps in wrong format, subgoals mismanaged.

## Pain Point 5: Pack Tool Surface Area

**Severity: Medium**

`pack_bond` alone has 14 parameters. The pack system has 10 tools total. The trust model (0-1 float), 8 interaction kinds, custom fields (comma-separated `key=value` syntax), directional links, contacts, and merge operations each have their own semantics. `pack_sense` has 6 parameters and 4 operating modes (overview, member detail, patrol, search).

**Observed symptoms:** Trust scores not updated, interactions not logged, custom fields unused, patrol never run, bonds going stale without maintenance.

## Pain Point 6: Thin Delegation Preamble

**Severity: Medium**

The entire additional context a delegated soul receives:

```markdown
## Delegation

You are executing a delegated task. Complete it thoroughly and return your result.
You cannot delegate to other agents.
```

Four lines. No guidance on interpreting ambiguous tasks, no common patterns, no structure for what to do when the task description is vague, no reminder to check existing state before creating new records.

---

## The Compounding Effect

These issues don't fail independently — they compound:

1. Coordinator forgets to delegate → information lost permanently
2. Coordinator delegates poorly → warden gets vague task → wrong tools called
3. Warden has too many tools → picks wrong one even with a good task
4. Warden has no conversation context → can't disambiguate when task is ambiguous
5. Errors accumulate: missed memories mean worse future recall, neglected pack means stale relationships, wrong quest states mean confusing temporal awareness
6. The agent on day 100 is worse than it should be — not because the systems can't compound, but because the seams leak

---

## The Fix: Bottom-Up Rewrite

The pain points above share a root cause: the systems were built top-down — designed for the agent ecosystem first, then fitted with tools and delegation after. The fix is to go the other direction. Rebuild each core system bottom-up in three phases, where each phase has a clear quality gate that must pass before the next begins.

### Naming: Faculties

These standalone systems are **faculties** — distinct cognitive systems with their own internal logic, data model, and domain expertise. The term comes from cognitive science: Fodor's modularity of mind describes mental faculties as encapsulated, domain-specific processing systems. That is exactly what these are.

Memory is a faculty. Social awareness (pack) is a faculty. Temporal commitment (quests) is a faculty. Procedural knowledge (skills) is a faculty. Identity evolution (souls) is a faculty. Each is complete in itself, with its own internal richness, designed to work independently.

The term avoids collision with every existing ghostpaw concept (skills, souls, traits, channels, tools) and fits the body metaphor already in the codebase ("the body ghostpaw thinks with"). Faculties are what a mind is made of.

### Phase 1: The Standalone System

Rewrite the core module from scratch as a **perfectly engineered standalone system**. Not a ghostpaw subsystem — a standalone system that happens to use SQLite. The kind of thing you could hand to another developer and say "build an app on top of this."

**What it receives:** A SQLite database connection. Nothing else.

**What it knows about ghostpaw:** Nothing. Zero imports from outside its own folder. No soul IDs, no session concepts, no delegation awareness, no harness knowledge. It is a self-contained domain engine.

**What it must have:**

- **Data model.** The SQLite schema is the source of truth. Every table, column, index, and constraint is justified by the domain — not by how an LLM might query it. The schema should make a database engineer nod. Timestamps, foreign keys, check constraints, sensible defaults. The model is designed for the domain's actual operations, not for the convenience of a tool layer that doesn't exist yet.

- **Interface functions.** A clean public API surface — pure functions that take the database handle and domain-typed arguments, return domain-typed results. Read functions are side-effect-free. Write functions are transactional. Error cases return actionable messages. The API is the kind you'd document in a library README: here's how to create, read, update, query, and maintain records in this system. No optional parameters that only make sense when an LLM is calling. No special modes bolted on for agent convenience.

- **Domain logic.** Validation, derived state, lifecycle transitions, maintenance operations — whatever the domain requires. If the system has a lifecycle (like quest states), the valid transitions are enforced in code, not in prompt guidance. If the system has integrity constraints (like memory deduplication), they're enforced in the module, not hoped-for in a tool description. The logic is where domain expertise lives — tight, tested, correct.

- **Tests.** Comprehensive. The test suite IS the specification. Every interface function has happy path, edge cases, misuse, and invariant tests. The tests run against an in-memory SQLite database, fast and isolated. A stranger reading only the test file should understand exactly what this system does, what it rejects, and how it fails.

- **README.** A standalone document that explains: what this system is, what problem it solves, what the data model looks like, how to use the interface functions, and what the maintenance story is. Written for a developer who has never heard of ghostpaw. If the README doesn't make sense without referencing souls or delegation, the module isn't standalone yet.

**The quality gate:** Could you publish this as an open-source library? Could another project import it and build a working application on top of it? If the answer is "yes, but they'd also need to understand souls/delegation/the harness," it's not done. The module must be **complete and useful in isolation**.

### Phase 2: The Dedicated Soul

Once the standalone system passes the Phase 1 gate, create a **dedicated soul** that is precisely trained to operate it. This is not a generic "persistence keeper" — it is a specialist whose entire cognitive identity is shaped around one domain.

**What the soul must have:**

- **Essence.** A soul essence written specifically for this domain. Not "you manage memory and pack and quests" — one domain, one identity. The essence encodes the judgment calls this domain requires: when to create vs update, how to handle ambiguity, what maintenance patterns matter, what errors look like and how to recover. The essence is the cognitive equivalent of the README — a developer reading it should think "this mind knows exactly what it's doing in this domain."

- **Tools.** A hand-optimized tool surface built on top of the Phase 1 interface functions. The tool count stays in the **4-8 range** — the zone where LLM tool-use is reliable. Every tool has a clear, non-overlapping purpose. Parameter counts are minimal. Complex multi-step operations that the current tools expose as separate calls should be collapsed into single tools where the domain logic handles the orchestration. Tool descriptions are written for LLM consumption — specific, unambiguous, with examples where helpful. No tool requires the caller to know implementation details (like Unix timestamps or RRULE syntax) that the tool itself could handle.

- **Tool guidance.** A focused block of operational instruction — not 45 lines covering three domains, but 10-15 lines covering one domain deeply. Common patterns, not aspirational principles. "When you receive a task mentioning a person, always check existing records first" — not "be thorough."

- **Tests.** The soul's tool surface is tested independently: does the right tool get called for representative tasks? Do the tools produce correct results through the Phase 1 API? Do error messages guide the LLM toward recovery?

**The quality gate:** Give this soul its tools and a representative set of 20 natural-language tasks. Does it complete them correctly at least 90% of the time without help from other souls? If it needs cross-domain knowledge to succeed, either the task belongs to a different soul or the domain boundary is wrong.

### Phase 3: Ecosystem Integration

Once the standalone system and its dedicated soul both pass their gates, integrate into the wider ghostpaw ecosystem. This is where the pain points get addressed — but by this point, most of them are solved by construction.

**What integration must achieve:**

- The coordinator gains a focused delegation target (`ask_<domain>`) instead of routing through an overloaded generalist. The tool description tells the coordinator exactly when to delegate and what information to include.

- The dedicated soul receives conversation context alongside the task — not just a free-form string, but the relevant slice of conversation that motivated the delegation. The translation tax is minimized because the soul can read the primary source.

- Cross-domain operations that currently rely on one soul seeing everything (like "what do I know about Sarah?" needing memory + pack) are handled through explicit orchestration — either the coordinator makes two focused delegations, or a thin coordination layer combines results. The mechanism is designed, not hoped-for.

- Automatic persistence hooks ensure the coordinator doesn't need to remember to delegate for common patterns. The system is structurally reliable, not behaviorally hopeful.

**The quality gate:** Run the full ghostpaw agent through representative conversations. Does the new soul perform its domain at higher quality than the old warden did? Is information persisted more consistently? Are the tools used correctly more often? Does the coordinator delegate to the right soul at the right time?

### What Success Looks Like

When all core systems have passed through all three phases:

- Each domain is a standalone, publishable-quality module with its own schema, API, tests, and docs
- Each domain has a dedicated soul with 4-8 tools that it uses reliably
- The coordinator delegates to focused specialists instead of one overloaded generalist
- The tool count per soul stays in the reliable zone
- Persistence happens structurally, not discretionarily
- The agent on day 100 is genuinely better than day 1 — because the systems that enable compounding actually work reliably at the seams
