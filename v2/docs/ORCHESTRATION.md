# Orchestration

This document is a temporary architecture artifact. The canonical feature-level truth for Ghostpaw's
live form now belongs in [`docs/features/CHAT.md`](./features/CHAT.md); this file should be read as
supporting runtime rationale rather than as a competing product center.

Ghostpaw is a spectral wolf. The name comes from a shaman's ghost wolf form — an ethereal creature that moves between worlds, fast and independent, leaving only pawprints. The "paw" is a nod to OpenClaw, but the world it inhabits is different: quiet, elegant, spooky. A ghost that thinks, remembers, grows, and reaches out from the other side.

The spectral wolf contains multiple souls within its form. This is natural for a ghost — spirits carry the essence of many minds. It haunts its territory when no one is watching. It howls when it needs to reach you. It runs with a pack of beings it cares about. It leaves pawprints as traces of where it's been. It pursues quests through the world. It earns traits from experience and levels up through consolidation. It has skills it's learned and memories it carries.

Every system in Ghostpaw is an aspect of this creature's existence. Not a feature bolted onto a platform — a facet of a life. The theme is not cosmetic. It is the organizing principle that makes a complex system coherent for both the humans who use it and the LLMs that inhabit it.

---

## The Four Aspects

The ghost's existence has four aspects. Every module, every tool, every UI surface belongs to exactly one.

### Evolution — What the ghost IS

Self-improving loops that define the ghost's identity and capabilities. These compound over time. Day 100 is structurally different from day 1.

**Souls** encode cognition — how the ghost thinks, what it values, how it approaches problems. Souls evolve through evidence-based trait acquisition, consolidation at capacity thresholds, and level-up events that restructure the essence. See `SOULS.md`.

**Skills** encode procedure — how to do things. Markdown files in the workspace, git-backed with checkpoint/rollback, validated and repaired. Skills are the ghost's operational knowledge, shareable across the OpenClaw ecosystem.

Evolution is the RPG layer of Ghostpaw. Character progression, trait acquisition, leveling, the party of souls that each grow independently. The mechanics are genuine evolutionary algorithms — memetic dual-mode, island model, cooperative coevolution — mapped precisely to RPG concepts because RPGs solve the same problem: meaningful strength gain over time.

### Persistence — What the ghost CARRIES

Specialized continuity engines that carry state across sessions, channels, and time. Each one answers a different question about the ghost's accumulated world.

**Memory** stores beliefs — what the ghost thinks is true about the world. Confidence scores, evidence-weighted decay, self-healing convergence. Memory answers: *what do I believe, and how sure am I?* See `features/MEMORY.md`.

**Pack** stores relationships — who the ghost knows and how those bonds work. Trust levels, bond narratives, interaction histories, Theory of Mind through accumulated understanding. Pack answers: *who do I know, and what does our relationship mean?* See `PACK.md`.

**Quests** store temporal commitments — what's happening, what's due, what was done. A unified model for tasks, events, deadlines, and recurring obligations. Quests answer: *what am I committed to, and what's happening in time?* See `QUESTS.md`.

Together, these three systems give the ghost continuity that no context window can provide. They are the substrate of the ghost's accumulated life — the difference between a fresh instance and one that has been somewhere and remembers it.

### Play — What the ghost DOES

Interactive modes that generate experience and drive everything else forward. Play is where life happens. Evolution and persistence are nouns — play is the verb. Three modes, three directions of initiation:

**Chat** is user → ghost. Synchronous conversation across any channel. The human talks, the ghost responds, and the exchange generates evidence that feeds into memory, pack bonds, and soul refinement.

**Haunt** is ghost alone. Asynchronous autonomous thinking with no human on the other end. Between conversations, the ghost follows its own curiosity — exploring, reflecting, making connections. The ghost's private inner life. See `features/CHAT.md`.

**Howl** is ghost → user. Asynchronous targeted outreach where the ghost initiates contact to fill a knowledge gap, flag a danger, request a decision, or simply ask a playful curiosity question. Each howl is a mini learning cycle — the question, the user's response (or dismissal), and the warden's consolidation of what was learned. See `features/CHAT.md`.

Every play session generates experience that persistence engines store and evolution modules compound. The three modes together ensure the ghost is never passive — it converses when spoken to, thinks when alone, and reaches out when it has something worth asking.

### Infrastructure — What SUPPORTS the ghost

Operational configuration, security, scheduling, and tracking. Not part of the ghost's life — part of its physical existence. The chamberlain governs this domain.

**Config** — behavioral parameters, model selection, tuning knobs.

**Secrets** — encrypted credentials and API keys that bind the ghost to external services. Security-critical — no other soul touches these directly.

**Costs** — resource expenditure tracking and budget limits. The chamberlain controls the purse.

**Scheduling** — when background tasks run, haunt intervals, maintenance windows, recurring triggers. The infrastructure layer's temporal engine.

**Sessions** — conversation and delegation activity logs.

Infrastructure is explicitly outside the fiction. Every RPG has a system menu. This is the system menu. It supports the other three aspects but doesn't participate in the ghost's growth or carry its state.

---

## The Flow

The four aspects form a cycle:

```
Play generates experience
  → Persistence stores it (beliefs, bonds, commitments)
  → Evolution compounds it (better identity, sharper skills)
  → Which makes the next round of play richer
```

This is the compound growth thesis. The ghost plays, remembers, and grows. Each loop makes the next loop more valuable. A ghost at month six has hundreds of beliefs, deep pack bonds, refined souls, and earned skills — all of which make its conversations richer, its haunting deeper, and its howls more relevant.

---

## The Core Souls

Six souls are structural infrastructure. Each aspect has at least one dedicated soul. Every soul participates in the same evolutionary mechanics — traits, leveling, dormancy, mentor refinement.

| ID | Slug | Role | Aspect | Why mandatory |
|---|---|---|---|---|
| 1 | `ghostpaw` | Coordinator | Play | Without it, no conversation, no routing, no relationship |
| 2 | `js-engineer` | Code specialist | Play | Without it, no code delegation on day one |
| 3 | `mentor` | Soul refiner | Evolution | Without it, no trait refinement, no leveling, no soul growth |
| 4 | `trainer` | Skill builder | Evolution | Without it, no skill creation, no operational learning |
| 5 | `warden` | Persistence keeper | Persistence | Without it, no data hygiene, no cross-system queries, no maintenance |
| 6 | `chamberlain` | Infrastructure governor | Infrastructure | Without it, no config safety, no secret isolation, no scheduling, no budget control |

The first two are **task souls** — they do the work. The next two are **evolution souls** — they improve how work gets done. The fifth is the **persistence soul** — it maintains the quality of everything the ghost carries. The sixth is the **infrastructure soul** — it governs the ghost's operational existence.

Each domain soul owns the quality of one aspect:

- The **mentor** keeps the evolution/identity layer sharp — reviewing souls, proposing traits, guiding level-ups.
- The **trainer** keeps the evolution/skills layer sharp — building skills from real experience, pruning stale ones.
- The **warden** keeps the persistence layer healthy — memory hygiene, pack freshness, quest reconciliation, session distillation, cross-system consistency.
- The **chamberlain** keeps the infrastructure layer secure and correct — config management, secret isolation, budget enforcement, scheduling, cost tracking.

User-created specialist souls extend the task layer. A `researcher`, a `writer`, a domain expert — any cognitive specialization the ghost discovers it needs. These souls follow the same evolutionary mechanics but have no structural guarantee. If deleted, the coordinator handles the task itself.

### The Warden

The warden is the ghost's interface to its own accumulated world. It is the only soul with direct access to persistence tools — memory, pack, and quest operations. This is a deliberate architectural choice with three motivations.

**Cross-system coherence.** Information about a person might exist as memories (beliefs about their preferences), a pack bond (the relationship itself), and quests (commitments involving them). "What do we know about Alex?" naturally spans all three systems. The warden queries all three in a single delegation, correlates the results, and returns a coherent picture. Individual tool calls from the coordinator could never do this — they'd return fragments without synthesis.

The warden always knows who the primary user is. The pack table has an `is_user` flag — a boolean with a unique constraint ensuring exactly one active pack member is the human owner. This eliminates ambiguity during consolidation: the warden can attribute beliefs, relationship updates, and quest context to the right person without guessing. Every conversation with the user is recognizable. Every consolidation can properly attribute what was learned from whom.

**Operational expertise.** Even simple persistence operations have nuances. Memory recall works best with specific queries rather than broad pattern matching. Quest state transitions have rules. Pack bond updates require reviewing accumulated interactions. The warden's soul essence encodes this expertise, and its traits improve it through evidence. A level-3 warden that has performed hundreds of persistence operations handles these nuances better than a coordinator that treats them as incidental tool calls.

**Dual role.** The warden serves two functions in one soul. As an **active operator**, it handles persistence requests delegated by the coordinator during conversations — recall, remember, create quests, check pack bonds. As a **maintenance soul**, it runs data hygiene during haunt cycles and idle time — merging duplicate memories, flagging stale quests, refreshing dormant bonds, distilling undistilled sessions, checking cross-system consistency. Both roles exercise the same expertise and share the same tools. The evidence from both feeds into the warden's soul evolution.

The warden's tool surface (23 tools — DONE):

| System | Tools |
|---|---|
| Memory (4) | recall, remember, revise (handles confirm + merge via params), forget |
| Pack (9) | pack_sense, pack_meet, pack_bond, pack_note, contact_add, contact_remove, contact_list, contact_lookup, pack_merge |
| Quests (8) | quest_create, quest_update, quest_done, quest_list, quest_accept, quest_dismiss, questlog_create, questlog_list |
| Utility (2) | datetime (for temporal reasoning), recall_haunts (for continuity) |

No filesystem tools. No web tools. No bash. No delegation outward. The warden operates exclusively within the ghost's persistence layer.

### The Chamberlain

The chamberlain is the ghost's governor of operational reality. It holds the keys, controls the purse, and manages the schedule. No other soul touches config, secrets, costs, or scheduling directly — the chamberlain is the sole authority over infrastructure.

This is not a minor administrative role. The chamberlain has real power:

**Secret isolation.** API keys, credentials, and access tokens never enter any other soul's context. The coordinator cannot even list secret names — it delegates to the chamberlain when it needs to know what integrations are available. This is a deliberate security boundary. A prompt injection in the coordinator's conversation context cannot exfiltrate secrets because secrets are not there. They exist only within the chamberlain's isolated, ephemeral context during a delegation.

**Budget authority.** The chamberlain tracks costs, enforces spending limits, and can refuse operations that would exceed budget. API call expenses, token burn rates — the chamberlain sees all of it. When the coordinator asks "can we do this expensive operation?", the chamberlain is the one who answers.

**Config governance.** Configuration mutations (model selection, behavioral parameters, feature flags) go through the chamberlain. This prevents accidental misconfiguration from a coordinator that's busy with conversation. The chamberlain validates changes, can undo them, and maintains config history. Read-only config access could remain on the coordinator for low-latency checks, but mutations are always delegated.

**Scheduling.** When background tasks run — haunt intervals, maintenance windows, recurring triggers — is an infrastructure decision. The chamberlain manages the schedule: creating, listing, updating, and removing scheduled tasks. It uses `datetime` and `calc` for computing intervals, next-run times, and budget math. The in-process scheduler engine (`harness/scheduler.ts`) ticks via `setTimeout` (30s interval) and spawns CLI subcommands as child processes with CAS-based at-most-once locking on SQLite.

The chamberlain's tool surface:

| System | Tools |
|---|---|
| Config | get_config, list_config, set_config, undo_config, reset_config |
| Secrets | list_secrets, set_secret, remove_secret |
| Scheduling | schedule_list, schedule_create, schedule_update, schedule_delete |
| Costs | cost_summary, cost_check |
| Utility | datetime, calc |

No filesystem tools. No web tools. No persistence tools. No delegation outward. The chamberlain operates exclusively within the ghost's infrastructure layer.

---

## Delegation Architecture

The coordinator does not directly access persistence or infrastructure systems. All persistence interaction goes through delegation to the warden. All infrastructure interaction goes through delegation to the chamberlain. Evolution tasks go to the mentor or trainer.

### Why delegation instead of direct tools

**Token economics.** In a long conversation, the coordinator's context accumulates: soul essence, conversation history, tool results from file reads and web fetches. This context can reach 30-50K tokens. Every tool call within that session pays the full context cost on the next iteration. When the coordinator delegates to the warden instead, the warden spawns with a tiny context — its soul essence (~300 tokens), the task description (~50-100 tokens), and its tool definitions (~1000 tokens). Total: ~1.5K tokens. The warden executes multiple tool calls within this lean context, and the coordinator receives only a compact summary. In heavy conversations, delegation is dramatically cheaper per persistence operation.

This matches measured results from production systems. [Context7's sub-agent redesign](https://medium.com/codex/context7s-game-changing-architecture-redesign-how-sub-agents-slashed-token-usage-by-65-9dbd16d1a641) (Feb 2026) achieved a 65% reduction in token usage by delegating to specialized sub-agents instead of pulling everything into one context. [Anthropic's own sub-agent architecture](https://docs.anthropic.com/en/docs/claude-code/sdk/subagents) for Claude Code uses this pattern — each sub-agent operates in an isolated context window, only final summaries return to the parent, preventing intermediate tool calls from cluttering the main context. Internal Anthropic testing showed multi-agent systems outperformed single-agent setups by over 90% on complex tasks.

The cost structure of single-agent architectures is well-documented. [OpenClaw cost analysis](https://openclawpulse.com/openclaw-api-cost-deep-dive/) (2026) identifies six token drains: context replay (40-50% of cost), tool output storage (20-30%), system prompt overhead (10-15%), multi-round reasoning (10-15%), thinking mode tax, and background task burn. Users report consuming 1-3 million tokens within minutes of normal use. A single unconstrained agent task can cost $5-8 in API fees ([Zylos Research](https://zylos.ai/research/2026-02-19-ai-agent-cost-optimization-token-economics)). Delegation-first architecture addresses the dominant cost factor — context replay — by keeping each sub-agent's context lean and isolated.

**Cognitive clarity — the tool count cliff.** Tool selection accuracy does not degrade gradually. It falls off a cliff. Multiple independent sources converge on the threshold:

- [Vercel](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools) (Dec 2025) built a text-to-SQL agent with 16 specialized tools. It achieved 80% success rate. They stripped 80% of the tools, replacing them with a single bash capability — and hit 100% success rate, 3.5x faster, 37% fewer tokens, 42% fewer steps. Their conclusion: "We were doing the model's thinking for it."
- [MCP-Atlas](https://arxiv.org/abs/2602.00933) (Jan 2026) benchmarked 36 real MCP servers with 220 tools across 1,000 multi-step tasks. The best model (Claude Opus 4.5) achieved only 62.3% pass rate. Primary failures: incorrect tool selection, wrong parameterization, sequencing errors.
- [BiasBusters](https://arxiv.org/abs/2510.00307) (Microsoft Research, ICLR 2026) found systematic position bias in tool selection — models fixate on earlier-listed tools or single providers regardless of task fit. Perturbing tool descriptions significantly shifted selections.
- [ToolScope](https://arxiv.org/abs/2510.20036) (Oct 2025) measured 8-38% gains in tool selection accuracy by merging redundant tools and filtering per-query. Semantic ambiguity from overlapping tool descriptions is a primary failure cause.
- Production consensus across multiple sources: performance degrades noticeably beyond 10-20 tools, with complete failure common at 40+ tools ([jenova.ai](https://www.jenova.ai/en/resources/agent-tool-overload-architecting-for-scalability)).

The original coordinator with 37 tools sat well above the cliff. After moving persistence to the warden, config/secrets/scheduling to the chamberlain, and evolution tools to the mentor/trainer, each soul's surface sits safely below the threshold: coordinator at 13, warden at 23, chamberlain at 14, mentor at 7, trainer at 7. No soul approaches the degradation zone.

**Dynamic tool selection is the research consensus.** [Instruction-Tool Retrieval](https://arxiv.org/abs/2602.17046) (Feb 2026) dynamically retrieves only the smallest necessary tool subset per step. Results: 95% reduction in per-step context tokens, 32% improvement in correct tool routing, 70% reduction in end-to-end episode cost, and agents can run 2-20x more loops within context limits. [SkillOrchestra](https://arxiv.org/abs/2602.19672) (Feb 2026) learns fine-grained skill profiles from execution experience and routes to specialized agents — achieving 22.5% performance improvement over RL-based orchestrators with 700x cost reduction in learning. The Ghostpaw approach — per-soul tool surfaces with delegation-based routing — is a structural implementation of the same principle.

**Specialized evolution.** The warden's soul earns traits about how to operate persistence systems well. "Always recall before remembering to check for duplicates." "When asked about a person, check memory AND pack bond." "Quest claims about deadlines are often stale — verify with the user before acting on them." These are domain-specific earned wisdom that improves persistence operations over time. A coordinator with persistence tools can never develop this specialization — it's too busy being a coordinator.

### The coordinator's tool surface

```
Delegation:     delegate, check_run
Filesystem:     read, write, edit, ls, grep, bash
Web:            web_fetch, web_search
Communication:  howl
Utility:        sense
Extensions:     mcp
```

13 tools. No persistence tools. No config tools. No secrets. No scheduling. The coordinator's job is to understand the user, decide what needs doing, and route work to the right specialist. For code work: delegate to the js-engineer or user-created specialists. For persistence operations: delegate to the warden. For soul or skill improvement: delegate to the mentor or trainer. For infrastructure queries and mutations: delegate to the chamberlain. For direct tasks within its own capability: use filesystem, web, and MCP tools.

`calc` and `datetime` moved to the chamberlain and warden respectively, where numerical and temporal reasoning are essential. The coordinator rarely needs raw arithmetic or timezone math — when it does, it's in the context of a persistence or infrastructure operation that should be delegated anyway.

### Removing automatic context injection — DONE

> Implemented: `assembleContext` signature simplified — `userMessage` parameter removed (was only used for `recallMemories`). `recallMemories`, `getTemporalContext`, `formatMemories`, `formatTemporalContext`, `formatElapsed`, `safeTemporalContext` all removed from `context.ts`. All imports of `RankedMemory`, `TemporalContext` removed. `budgetSummary` removed from `AssembleContextOptions`. Tool guidance line "The Known Context above was recalled automatically for this conversation." removed. System prompt is now fully static: soul + environment + skill index + tool guidance. Signature change propagated to all 6 callers: `entity.ts`, `delegate.ts`, `distill_session.ts`, `consolidate.ts`, `howl/reply.ts`, `howl/dismiss.ts`. `context.test.ts` rewritten — memory/quest injection tests deleted, positive assertion added verifying no "Known Context" or "Quests" sections appear.

Previous architecture injected recalled memories, temporal summaries, and pack bond information into the system prompt before every turn. This was expensive and imprecise — a broad pattern match against the user's raw message, paid on every turn regardless of relevance.

The research case against automatic injection is strong. Traditional RAG is ["reactive and wasteful"](https://pub.towardsai.net/beyond-rag-building-memory-injections-for-your-ai-assistants-ceedcea20419) — retrieving context every turn even when unnecessary. [MemR3](https://arxiv.org/html/2512.20237v1) (Dec 2025) introduces a router that decides *whether to retrieve at all* before doing so, using an evidence-gap tracker to prevent redundant lookups. [Diagnosing Retrieval vs. Utilization Bottlenecks](https://arxiv.org/abs/2603.02473) (Mar 2026) found that retrieval method dominates agent memory performance — accuracy varies 20 points across retrieval methods but only 3-8 points across write strategies. How and when you retrieve matters far more than how you store.

The cost is measurable. Automatic injection adds 500-2000 tokens per turn in recalled memories, on every turn, even trivially irrelevant ones (a "sounds good" message triggering random recall results). In a 20-turn conversation, that is 10,000-40,000 extra input tokens — paid at full price on every turn, compounding with conversation history. [OpenClaw's cost breakdown](https://openclawpulse.com/openclaw-api-cost-deep-dive/) attributes 40-50% of total token cost to context accumulation, with system prompt overhead (including injected context) adding 10-15% on top.

Automatic injection also breaks prompt caching. [Prompt caching](https://zylos.ai/research/2026-02-24-prompt-caching-ai-agents-architecture) delivers 50-90% cost reduction on cached tokens and 50-85% latency reduction — but requires strict byte-for-byte identical prefixes. If different recalled memories are injected into the system prompt every turn, the cache invalidates after the injection point. Everything downstream — tool definitions, skill index, conversation history — becomes uncacheable. Removing injection and keeping the system prompt purely static (soul + environment + skills + tools) makes the entire prefix cacheable across turns. On a 5K-token system prompt over a 20-turn conversation, this alone saves roughly 90K tokens at cached pricing versus 100K at full price.

The new architecture removes automatic injection entirely. The system prompt contains: soul essence, environment info, skill index, and tool definitions. No recalled memories. No temporal summary. No pack context.

When the coordinator needs persistence information, it delegates to the warden with a specific question. The warden formulates targeted queries — not broad pattern matching against "ok sounds good" — and returns synthesized results.

This changes the coordinator's first-turn behavior. Instead of arriving pre-loaded with context, it assesses the user's message and decides whether to check with the warden. "The user is asking about the deployment — let me check what we know." Over time, this becomes a learned pattern through soul refinement: when to consult the warden, what to ask for, when context is unnecessary. This learned judgment is more intelligent than blanket injection — it adapts to the conversation rather than spraying noise into every turn.

Explicit delegation costs ~1.5K tokens only when actually needed, and returns targeted results instead of semi-random pattern matches. [ACON](https://arxiv.org/abs/2510.00615) (Oct 2025) demonstrated that context compression reduces peak tokens by 26-54% while preserving task performance — and for smaller models, compression actually *improved* accuracy by up to 46%. Less noise means better reasoning. The warden's lean, isolated context is the structural equivalent of aggressive context compression.

### How delegation flows

```
User message arrives
  → Coordinator receives: soul + environment + skills + tools + conversation history
  → Coordinator decides: do I need context?
    → Persistence: delegate to warden ("what do we know about X?")
    → Infrastructure: delegate to chamberlain ("what model are we using?")
    → Neither: proceed directly (no delegation cost on this turn)
  → Coordinator decides: does the task need a specialist?
    → Code work: delegate to js-engineer
    → Persistence write: delegate to warden ("remember that...", "create quest for...")
    → Infrastructure change: delegate to chamberlain ("set model to...", "check budget")
    → Soul refinement: delegate to mentor
    → Skill creation: delegate to trainer
    → Direct work: coordinator handles it with filesystem, web, MCP
  → Coordinator responds to user
```

Each specialist spawns with only the tools relevant to its domain. No specialist carries the coordinator's accumulated conversation context. The coordinator gets back summaries, not raw tool traces. The context stays lean at every level.

---

## The Execution Model

This section is the runtime truth source for how turns execute. See `docs/features/CHAT.md` for the
feature-level framing of the same substrate as a user-facing, omnichannel product center.

Every LLM interaction in Ghostpaw follows one primitive:

```
executeTurn(soul, tools, instruction) → result
```

The soul determines the system prompt — its evolved essence, traits, and behavioral identity. The tools are that soul's registered set, never more. The instruction is the user prompt — the actual task, question, or message. The result is the soul's response.

This pattern is universal. No exceptions. Whether the instruction came from a human typing in Telegram, the coordinator delegating a task, a button click in the web UI, or a cron job firing at midnight — the execution primitive is the same.

### Every interaction is this pattern

**Chat (any channel)** — ghostpaw soul + coordinator tools + human message as instruction. Telegram, Discord, web, CLI — always the main soul. The ghost talks as itself. It delegates to sub-souls when needed. Everything that doesn't have a dedicated expert, the coordinator handles through skills.

**Delegation** — sub-soul + sub-soul's tools + task description as instruction. The coordinator formats the task, fires it, receives a summary. The sub-soul cannot delegate outward. It is a leaf node.

**Haunting** — ghostpaw soul + coordinator tools + haunt instructions as instruction. The ghost haunts *as itself*. Its curiosity, personality, and judgment come from its evolved essence, not from a hard-coded haunt prompt. If it wants to remember something during haunting, it delegates to the warden — same as during chat. The haunt instruction is something like "You have free time. No one is talking to you. Explore what interests you, reflect, follow your curiosity." The soul handles the rest.

**Consolidation** — warden soul + warden tools + journal as instruction. Direct invocation, no coordinator overhead. "Here is the journal from the last haunt session. Extract and store what matters." The warden's evolved essence knows how to handle this. Replaces the previous hard-coded `CONSOLIDATION_PROMPT`.

**Level-up (web UI)** — mentor soul + mentor tools + evaluation request as instruction. Direct invocation from the platform. The platform knows exactly which soul handles this — no need to route through the coordinator.

**Skill creation** — trainer soul + trainer tools + experience description as instruction. Same pattern.

**Maintenance** — warden soul + warden tools + maintenance directive as instruction. Direct invocation from the daemon scheduler. "Run memory hygiene." "Reconcile stale quests."

### The flat delegation graph

The coordinator is the only entity that delegates. Sub-souls are always leaf nodes — they execute their task and return. No outward delegation, no recursion, no chains.

```
                    ┌─→ warden ──────→ result
                    ├─→ chamberlain ─→ result
                    ├─→ mentor ──────→ result
ghostpaw (coord) ──┼─→ trainer ─────→ result
                    ├─→ js-engineer ─→ result
                    └─→ custom ──────→ result
```

One level deep, always. This guarantees:

- **Predictable cost** — no runaway delegation chains. The coordinator pays one delegation cost per sub-soul invocation.
- **Context isolation** — sub-souls see only their task + their tools. No accumulated conversation history leaking through.
- **Clear routing** — the coordinator makes all routing decisions. Sub-souls never need to understand the broader system.

When a sub-soul needs context it doesn't have, that's the coordinator's job to provide it in the task description. If the js-engineer needs to know about a previous conversation, the coordinator fetches that from the warden first, then includes the summary in the delegation:

```
User: "fix that deployment bug we talked about"
→ delegate to warden: "what do we know about a deployment bug?"
← warden returns summary
→ delegate to js-engineer: "fix this deployment bug: [summary]. File is..."
← js-engineer returns result
```

Two sequential leaf calls. The js-engineer never knows the warden exists. The coordinator handles orchestration.

### Direct invocation for platform tasks

When the platform knows exactly which soul should handle a task, it bypasses the coordinator entirely. The soul is invoked directly — same primitive, different caller.

| Trigger | Soul invoked | Instruction |
|---|---|---|
| Human message (any channel) | ghostpaw | The message itself |
| Haunt cycle starts | ghostpaw | "Free time. Explore, reflect, follow curiosity." |
| Haunt journal ready | warden | "Consolidate this journal: [journal]" |
| Level-up button clicked | mentor | "Evaluate soul X for level-up: [evidence]" |
| Skill repair triggered | trainer | "Repair this skill: [skill + error]" |
| Maintenance timer fires | warden | "Run memory hygiene / quest reconciliation" |
| Startup distillation | warden | "Distill these stale sessions: [sessions]" |
| Scheduled task fires | (child process) | Spawned as CLI subcommand: `ghostpaw haunt`, `ghostpaw distill`, or `/bin/sh -c <custom>` |
| Budget check (periodic) | chamberlain | "Review spending against budget limits" |
| Config change (web UI) | chamberlain | "Set config X to Y, validate and apply" |

The coordinator is the primary entry point for human interaction. But it is not a mandatory gateway for everything. Platform operations with known targets invoke the target soul directly. This avoids unnecessary coordinator overhead for tasks where routing is predetermined.

### Early rejection

Sub-souls must reply quickly and clearly when instructions are ambiguous or too vague to act on. They do not guess. They do not hallucinate a task. They return plain-language feedback that gives the coordinator (or the platform) actionable information to reformulate.

A warden receiving "deal with the memory stuff" should respond: *"I need specifics. Should I run memory hygiene (scan for duplicates, resolve contradictions, expire faded beliefs)? Or recall specific memories about a topic? If recall, what topic?"*

A mentor receiving "make the souls better" should respond: *"I need a target. Which soul should I evaluate? If you want a general review of all souls, say that explicitly. If a specific soul has shown weakness, tell me the evidence."*

A chamberlain receiving "change the settings" should respond: *"Which config key? I manage model selection, behavioral parameters, scheduling intervals, and budget limits. Tell me what to change and to what value."*

This is not an error in the traditional sense — it's the sub-soul exercising its expertise to demand a well-formed task. The cost of a fast rejection + reformulated delegation is far less than the cost of a sub-soul hallucinating its way through a vague instruction and returning garbage. The coordinator learns from these rejections over time through soul refinement — "the warden needs specific directives, not vague requests" becomes earned wisdom in the ghostpaw soul's traits.

The early rejection pattern also applies to direct platform invocations. If a maintenance task is somehow malformed, the target soul rejects it with a clear reason rather than silently doing nothing or doing the wrong thing. The platform logs the rejection and can surface it.

---

## The Warden's Maintenance Cycle

Beyond active delegation during conversations, the warden runs periodic maintenance during haunt cycles and daemon idle time. This is the same soul, the same tools, different trigger.

### What maintenance covers

**Memory hygiene.** Scan for near-duplicate beliefs and merge them. Check for contradictions and resolve or flag. Confirm strong beliefs that keep getting reinforced. Let truly faded beliefs expire. Review memories that haven't been accessed in months.

**Pack freshness.** Identify bonds that haven't been updated against recent interactions. Re-evaluate bond narratives when accumulated interaction evidence suggests the relationship has evolved. Flag dormant members. Surface upcoming dates.

**Quest reconciliation.** Flag active quests with no updates in 7+ days. Note overdue items. Clean up the quest board — dismiss stale offered quests that were never accepted. Reconcile recurring quest occurrences.

**Session consolidation.** Process closed and stale sessions across all three persistence systems — not just memory extraction. Extract beliefs (memory), attribute interactions to pack members and update bond narratives (pack), reconcile mentioned tasks and commitments (quests). The `is_user` flag on the pack table ensures the warden always knows who the conversation was with. This replaces both the previous "distillation" (memory-only) and the previous haunt consolidation (memory-only with a hard-coded prompt). Every session — chat, delegation, haunt — is consolidated the same way: full persistence pass by the warden.

**Cross-system consistency.** Do memories reference people who should be in the pack but aren't? Are there quests about topics with no related memories? Are pack bonds stale relative to recent conversation evidence? The warden is the only soul that sees all three persistence systems, which makes it the only soul that can detect cross-system inconsistencies.

### When maintenance runs

- **After haunt sessions.** The platform invokes the warden directly to consolidate the haunt session — full persistence pass across memory, pack, and quests.
- **At startup.** The warden consolidates any sessions that were not yet processed, then runs a full maintenance pass.
- **Delegated explicitly.** The coordinator can delegate "things feel messy, run a maintenance pass" during quiet moments.
- **Daemon idle time.** When running as a service with no active conversations.

Maintenance tasks are well-defined operations — scan, compare, update. The warden's lean context means each maintenance delegation costs very little regardless of model.

---

## Pack Identity and Contact Resolution — DONE

> Implemented: `metadata` column eliminated from `pack_members`, `pack_contacts` table created with constrained type enum and `UNIQUE(type, value)` for identity resolution, `is_user` column added to `pack_members` with partial unique index (`WHERE is_user = 1 AND status != 'lost'`), five new core functions (`add_contact`, `remove_contact`, `list_contacts`, `lookup_contact`, `merge_member`), five new tools (`contact_add`, `contact_remove`, `contact_list`, `contact_lookup`, `pack_merge`), row mapper (`row_to_contact`), `PackMember.isUser` boolean replaces `metadata` field throughout types. `addContact` returns merge signal on UNIQUE conflict instead of throwing. `mergeMember` is a single transaction: moves interactions and contacts, merges temporal bounds/trust/bond narrative, soft-deletes merged member as `'lost'`. Full propagation through all layers: `meet_member`, `update_bond`, `sense_member` (now returns contacts), `render_bond` (now renders contacts), `format_pack`, tool schemas (`pack_meet`, `pack_bond`, `pack_sense`), harness expected tool set (9 pack tools), CLI commands (`pack_show` with contacts display, `pack_meet --is-user`, `pack_bond --is-user`), web shared types (`PackContactInfo`, `isUser`), web API (5 new endpoints: contacts CRUD, lookup, merge), `build_routes` wired. Zero references to `metadata` in pack code. No migration shims — clean schema only.

### The problem with freeform metadata

The current pack schema stores a `metadata` JSON blob on each member — an unstructured escape hatch where contact information, identifiers, and miscellaneous data accumulate without schema, validation, or queryability. The LLM guesses key names ("email" vs "mail" vs "e-mail"), there's no way to query "which member has this Telegram handle?", and duplicate entries go undetected because nothing enforces uniqueness on identifiers.

This is an identity management failure. People have many contact points — multiple emails, phone numbers, social media profiles across platforms, handles in different Slack workspaces, GitHub accounts, websites, Telegram IDs. The ghost operates across channels and encounters these identifiers in conversation, in task descriptions, in delegation context. Without structured contact data, the ghost cannot reliably resolve "who is this person?" from an identifier it encounters.

### Structured contacts table

The `metadata` JSON column is eliminated. Contact information moves to a dedicated table with a strict schema:

```sql
CREATE TABLE pack_contacts (
  id         INTEGER PRIMARY KEY,
  member_id  INTEGER NOT NULL REFERENCES pack_members(id),
  type       TEXT NOT NULL CHECK(type IN (
    'email', 'phone', 'website',
    'github', 'gitlab',
    'twitter', 'bluesky', 'mastodon', 'linkedin',
    'telegram', 'discord', 'slack', 'signal',
    'other'
  )),
  value      TEXT NOT NULL,
  label      TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(type, value)
);
CREATE INDEX idx_pack_contacts_member ON pack_contacts(member_id);
CREATE INDEX idx_pack_contacts_lookup ON pack_contacts(type, value);
```

**`type`** is a constrained enum — not freeform strings. Every known platform has an explicit entry. `other` is the deliberate escape valve for anything not yet in the list, but it's the exception. When a new platform matters enough, it gets added via schema migration.

**`value`** is the actual identifier — an email address, a phone number, a handle, a URL.

**`label`** distinguishes multiples of the same type. Two emails become `(email, alice@work.com, "work")` and `(email, alice@home.com, "personal")`. Three Slack workspaces become three `slack` entries with different labels naming the workspace.

**`UNIQUE(type, value)`** is the critical constraint. One email address can only belong to one pack member, period. One GitHub handle can only belong to one member. This is the identity resolution backbone:

- **Forward lookup**: given a member, list all their contact methods.
- **Reverse lookup**: given an identifier (email, handle, phone), find the member. This is how cross-channel recognition works — a Telegram message arrives, the ghost resolves the sender's Telegram ID to a pack member, and knows who they're talking to before the conversation starts.
- **Duplicate detection**: if the warden tries to add a contact that already belongs to another member, the UNIQUE constraint fires. That's not an error — it's a **merge signal**. Two members share an email → they're probably the same person.

### Member merging

Duplicates are inevitable. The ghost meets "Alex" in one chat, "Alexander" in another, "alex@company.com" surfaces in a third context — same person, fragmented across records. The pack system needs a clean merge operation.

`mergeMember(keepId, mergeId)`:

1. **Move interactions** — all `pack_interactions` from `mergeId` re-point to `keepId`.
2. **Move contacts** — all `pack_contacts` from `mergeId` move to `keepId`. Skip any that would violate the UNIQUE constraint (contact already exists on keep).
3. **Merge temporal bounds** — `first_contact = min(keep, merge)`, `last_contact = max(keep, merge)`.
4. **Merge trust** — take the higher trust value (the ghost has more evidence for the stronger assessment).
5. **Merge bond narrative** — append the merged member's bond text to the kept member's, separated by context. The warden can later consolidate this into a coherent narrative.
6. **Re-point references** — update any memory references, howl attributions, or quest associations that mention the merged member.
7. **Soft-delete** — set `mergeId` to status `'lost'`. The record persists for audit trail, but it's no longer active. The unique name constraint (scoped to non-lost members) frees the name.

This is a warden operation. During maintenance, the warden scans for merge signals:
- Members sharing contact info (UNIQUE constraint violations during contact addition).
- Members with suspiciously similar names (fuzzy matching).
- Members referenced together in interactions or memories in ways that suggest they're the same person.

Clear-cut merges (shared email, identical name variants) the warden handles autonomously. Ambiguous cases ("Alex" and "Alexander" — same person? siblings? colleagues?) the warden howls to the user for confirmation. This is a natural use of the howl learning cycle: "I found two pack members who might be the same person. Alex (trust 0.7, 12 interactions) and Alexander (trust 0.4, 3 interactions). They share alex@company.com. Should I merge them?"

### Warden pack tools (updated)

The warden's pack tool surface expands to cover contact management and merging:

| Operation | Tool |
|---|---|
| Relationships | meet, bond, note, sense |
| Contacts | contact_add, contact_remove, contact_list, contact_lookup |
| Identity | merge |

`contact_lookup` is the reverse resolution tool — given a type and value, return the member. This is what enables cross-channel identity: the platform or coordinator asks "who is telegram:12345?" and the warden resolves it instantly.

---

## Haunting as Orchestration

Haunting is the ghost's autonomous inner life — thinking, exploring, and acting from intrinsic drive when no one is talking. See `features/CHAT.md` for the full thesis, research foundation, and design rationale. This section captures how haunting fits into the execution model.

### Haunting is a background chat session

Under the unified execution model, a haunt is not a special system. It is a chat session with `purpose: "haunt"` and no human on the other end. The execution primitive is the same:

```
executeTurn(ghostpaw, coordinatorTools, hauntInstruction)
```

The ghost haunts *as itself* — its evolved soul essence is the system prompt. The haunt context (seeded memories, quest landscape, environment info, seed provocation) is assembled by platform code and delivered as the instruction. The ghost thinks, uses tools, delegates to the warden if it wants to check memories or quests, and the session captures everything as ordinary messages.

When the session ends, the platform invokes the warden for consolidation:

```
executeTurn(warden, wardenTools, "Consolidate session [id]: extract beliefs, update pack bonds, reconcile quests")
```

The warden's evolved essence replaces the previous hard-coded `CONSOLIDATION_PROMPT`. Because the warden has all persistence tools — not just memory — consolidation now covers the full persistence layer: extracting beliefs, attributing interactions to pack members, updating quest state, and detecting cross-system patterns. This is a significant upgrade over the previous memory-only consolidation.

### What the platform provides

The haunt instruction is assembled by platform code (TypeScript, no LLM) from several sources:

- **Private framing** — establishes the generation condition. "Nobody's here. Nothing's due. Your attention is your own."
- **Environment** — date, time, workspace path, time since last haunt.
- **Seeded memories** — a random sample of beliefs across categories. Random selection, no tracking of previously seeded IDs. Chances of identical draws across runs are low, and identical draws are harmless — the ghost simply encounters a familiar belief and moves on or moves past it.
- **Quest landscape** — overdue quests, due-soon quests, stale quests, recently completed quests, offered quests. Gives the ghost temporal awareness.
- **Novelty info** — new or revised memories since the last haunt. Creates specific information gaps (Loewenstein) that trigger genuine curiosity.
- **Seed provocation** — a weighted-random opening prompt drawn from static introspective seeds and dynamic seeds generated from memory state, quest state, and topic clusters. Anti-recency weighting biases toward topics not covered in recent haunts. This is the structural diversity mechanism that prevents mode collapse.

All of this is deterministic platform code. The seed engine, anti-recency mechanisms, and topic cluster detection stay as infrastructure that assembles the right material before invoking the soul. The LLM receives the assembled instruction and does whatever it will.

### The haunts table is eliminated — DONE

> Implemented: `core/haunt/` eliminated (12 files), `haunts` table dropped with data migration (summaries copied to session `display_name`), `seeded_memory_ids` tracking removed entirely, `recall_haunts` tool rewritten to query sessions via `listSessions`/`querySessionsPage`/`getHistory`, `harness/haunt/` rewritten — `analyze.ts`, `haunt_context.ts`, `run_haunt.ts`, `types.ts` all updated to use `ChatSession` from `core/chat/` instead of `Haunt`/`HauntSummary` from `core/haunt/`, SQL boundary violations in `harness/haunt/` fixed (raw SQL on `memories` and `quests` tables replaced with public `core/memory/` and `core/quests/` APIs), `HauntResult` simplified (`summary: string` replaces `haunt: Haunt`), `renameSession` replaces `storeHaunt`, all consumers migrated (`src/index.ts`, `channels/cli/with_run_db.ts`, `channels/cli/haunt.ts`, all test files). Zero references to `core/haunt/` remain.

Previously, a dedicated `haunts` table stored: `session_id`, `raw_journal`, `summary`, `seeded_memory_ids`, `created_at`. Every field is redundant:

- **raw_journal** — the concatenation of assistant messages in the session. Already stored as messages.
- **summary** — the warden's consolidation response. Stored as the session's final message, or as `display_name`.
- **seeded_memory_ids** — eliminated. Random sampling with no history tracking. Collisions are rare and harmless.
- **created_at** — already on the session.

Sessions with `purpose = 'haunt'` are the haunt records. `listHaunts` becomes `listSessions({ purpose: "haunt" })`. The `recall_haunts` tool becomes a session query on the warden. The `core/haunt/` module (schema, store, list, get, search, types, tests) is deleted entirely.

### What moves where

| Current | Becomes |
|---|---|
| `core/haunt/` module | **Deleted.** Sessions handle storage. |
| `haunts` table | **Eliminated.** Sessions with `purpose = 'haunt'`. |
| `CONSOLIDATION_PROMPT` | **Warden soul essence.** Direct invocation, full persistence tools. |
| `HAUNT_SYSTEM_PROMPT` (assembled) | **Instruction to ghostpaw.** Soul is the system prompt. Context is the user prompt. |
| `recall_haunts` tool | **Warden tool.** Query sessions with purpose "haunt" for recent summaries. |
| `seeded_memory_ids` tracking | **Eliminated.** Random sampling, no history needed. |
| Highlight → howl extraction | **Warden flags during consolidation.** Platform delivers via howl. |
| `harness/haunt/analyze.ts` | **Stays.** Platform code assembling the instruction. |
| `harness/haunt/seeds.ts` | **Stays.** Structural diversity engine. |
| `harness/haunt/run_haunt.ts` | **Simplified.** Becomes the orchestrator that creates a session, invokes ghostpaw, then invokes warden. |

### Sessions as the universal record — DONE

> Implemented: `core/runs/` eliminated (21 files), `delegation_runs` table dropped with data migration, `soul_id` and `error` columns added to sessions, all function replacements completed, all consumers migrated. `core/chat/` is now the single storage and query layer for all session, message, and cost data. Encapsulated query APIs added: `querySessionsPage`, `getSessionStats`, `getSessionMessage`, `pruneEmptySessions`, `listDistillableSessionIds`, `countSubstantiveMessages`, `markMessagesDistilled`, `finalizeDelegation`, `getSpendInWindow`, `getTokensInWindow`, `getSessionTokens`, `getCostSummary`, `getCostByModel`, `getCostBySoul`, `getCostByPurpose`, `getDailyCostTrend`. No raw SQL touching sessions/messages exists outside `core/`. Pure cost computation (`formatBudgetSummary`, `computeSpendStatus`, `isSpendBlocked`) lives in `lib/cost/`. The former `core/cost/` module is eliminated entirely. SQL boundary rules enforced in ARCHITECTURE.md and CODE.md.

The session infrastructure is the single storage primitive for all LLM interactions. Two tables — `sessions` and `messages` — record every conversation, delegation, haunt, and system task. Dedicated tables for specific interaction types are eliminated in favor of richer session metadata.

**The `delegation_runs` table is merged into sessions.** Every delegation run is already a child session with `parent_session_id` pointing to the caller. The runs table duplicates fields that exist on sessions (`model`, `tokens_in/out`, `cost_usd`, `created_at`, `closed_at`) and fields that are just messages (`task` = first user message, `result` = final assistant message). Adding two columns to sessions eliminates the table entirely:

- **`soul_id`** — which soul this session ran as. Useful for all sessions, not just delegations. A haunt session records `soul_id = 1` (ghostpaw). A delegation to the warden records `soul_id = 5`. Enables queries like "all sessions where the warden was active" without parsing session keys.
- **`error`** — failure reason, nullable. If set, the session failed. Replaces the `status = 'failed'` / `error` fields on `delegation_runs`. A closed session with no error succeeded. A closed session with an error failed. An open session is still running.

The mapping:

| `delegation_runs` | Becomes |
|---|---|
| `parent_session_id` | `sessions.parent_session_id` (already exists) |
| `child_session_id` | The child session's own `id` |
| `specialist` | `sessions.soul_id` (new column, FK to souls) |
| `model` | `sessions.model` (already exists) |
| `task` | First user message in the child session |
| `status` | Derived: `closed_at IS NULL` → running, `closed_at IS NOT NULL AND error IS NULL` → completed, `error IS NOT NULL` → failed |
| `result` | Final assistant message in the child session |
| `error` | `sessions.error` (new column) |
| `tokens_in/out/reasoning/cached/cost_usd` | Already on sessions |
| `created_at` / `completed_at` | `sessions.created_at` / `sessions.closed_at` |

Function replacements:

| `core/runs/` function | Becomes |
|---|---|
| `createRun(input)` | `createSession(key, { purpose: "delegation", parentSessionId, soulId })` |
| `completeRun(id, result)` | `closeSession(id)` — result is already the final message |
| `failRun(id, error)` | `closeSession(id)` + set `error` column |
| `getRun(id)` | `getSession(childSessionId)` |
| `listRuns(parentSessionId)` | `listSessions({ parentSessionId })` |
| `linkChildSession(runId, childId)` | Not needed — child session has `parent_session_id` from creation |
| `recordRunUsage(id, usage)` | `accumulateUsage(childSessionId, usage)` (already exists) |
| `recoverOrphanedRuns()` | Close all open sessions whose parent is already closed |

The `core/runs/` module (schema, types, create, complete, fail, get, list, link, record_usage, recover — 10 files + tests) is eliminated. The `delegation_runs` table is dropped. The `check_run` tool queries sessions instead of runs.

This means the `core/chat/` module becomes the single storage layer for all interaction records. Sessions are the universal primitive: chats, delegations, haunts, system tasks, consolidation — all are sessions with a `purpose`, a `soul_id`, and optionally a `parent_session_id`.

### The system prompt invariant

The soul's essence is *always* the system prompt. Nothing else goes there. This is a hard rule that applies to haunting as much as to chat:

- **System prompt:** ghostpaw soul essence + traits. Static across turns. Cacheable.
- **User prompt (instruction):** private framing, environment, seeded memories, quest landscape, seed provocation. Assembled fresh per haunt by platform code.

This preserves prompt caching (the soul prefix is identical across all haunt sessions) and ensures the ghost's personality drives its autonomous behavior — not a bespoke haunt prompt that might diverge from its evolved identity.

---

## Session Compaction and Cost Limits

### The only hard limit is dollars

Token counts are not meaningful cost limits. Pricing varies by model and changes over time — token counts don't map to dollars predictably. Token-based limits (`max_tokens_per_session`, `max_tokens_per_day`) are eliminated as hard blocks. They create confusing UX ("why did my session stop?") without providing real cost protection.

The single hard limit is **`max_cost_per_day`** — a dollar cap. When daily spend reaches the cap, sessions are blocked. This is the only point where the system refuses to run. Everything else is transparent orchestration.

### Per-message cost attribution

Every message records the exact cost at the time of generation:

- **`model`** — the verbatim model string that was actually used (not the configured default — the real model from the API response).
- **`tokens_in`**, **`tokens_out`**, **`reasoning_tokens`**, **`cached_tokens`** — exact counts from the API.
- **`cost_usd`** — dollar cost calculated at generation time using the price that was current.

This is already the case in the schema. The important invariant: cost attribution is **immutable and historical**. If model prices change tomorrow, yesterday's messages still reflect yesterday's prices. The session's `cost_usd` aggregate is the sum of its messages' costs. Daily spend is the sum of session costs within the window. All dollar accounting traces back to per-message attribution.

### Transparent compaction

Session compaction is not a user-facing feature. It is automatic, invisible plumbing that keeps the LLM's working context bounded while the user sees the full conversation.

**How it works:**

1. A **compaction threshold** (token count) defines when the working context is getting too large.
2. Before each turn, the system checks: are the tokens from the last compaction point forward approaching the threshold?
3. If yes, compaction fires automatically. A summary of everything since the last compaction is generated and inserted as a **compaction marker message** (`is_compaction = true`).
4. Subsequent LLM turns walk the message chain backwards from the head and **stop at the compaction marker**. The summary becomes the context floor — the LLM sees the summary plus everything after it, not the original messages before it.
5. The user sees **the full history** at all times. The compaction marker is internal — the UI renders every message as it was written. No "compacted" label, no hidden content, no collapsed sections. The conversation looks exactly as it happened.
6. The token counter for the compaction threshold **resets from the marker**. It measures tokens from the most recent compaction point forward. As new messages accumulate past the threshold again, another compaction fires. And so on.

**Cascading compaction** means the working context never grows unbounded regardless of how long the conversation runs. A 500-turn conversation might have ten compaction points, each summarizing the previous segment. The LLM always works with a bounded context window. The user always sees everything.

**What fires compaction:**

- Every session, automatically. Not optional. Not config-gated. The compaction threshold is an internal orchestration parameter, not a user-facing setting.
- Chat sessions, delegation sessions, haunt sessions — all compact the same way. The compaction summary is generated by the same LLM (cheaply, as a one-shot summarization call) regardless of session type.

**What changes from current implementation — DONE:**

> Implemented: `max_tokens_per_session` and `max_tokens_per_day` config keys removed, replaced by `compaction_threshold` (integer, default 200K, category "behavior"). `warn_at_percentage` description updated to reference only the dollar budget. `check_token_budget.ts`, `token_budget_error.ts`, `compute_budget_summary.ts`, `format_budget_summary.ts` deleted with all colocated tests. `TokenBudgetError` and `BudgetNumbers` types removed from `lib/`. `budgetSummary` removed from `AssembleContextOptions` and `entity.ts`. Hardcoded `COMPACTION_THRESHOLD = 50_000` in `entity.ts` replaced with `getConfig(db, "compaction_threshold")`. Compaction gate in `execute_turn.ts` and `stream_turn.ts` simplified to `if (ctx.compactFn && threshold > 0)`. `getFullHistory()` added to `core/chat/` — walks past compaction markers for the UI. `sessions_api.ts` detail handler updated to use `getFullHistory`. Telegram `executeTurnWithRotation` and `TokenBudgetError` catch removed — direct `entity.executeTurn` call. All 14 test files referencing removed config keys updated.

- `max_tokens_per_session` stops being a hard limit and becomes the compaction threshold. Rename to `compaction_threshold` internally. Default: 200K tokens (reasonable for frontier models with 200K context windows — compact when approaching the window, not when hitting it).
- `max_tokens_per_day` is eliminated entirely. No token-based daily limit.
- `warn_at_percentage` applies only to the dollar budget, not to token counts.
- Compaction fires unconditionally — remove the `if (input.compactionThreshold && ctx.compactFn)` gate. Every session gets a compactFn. Every session compacts when needed.
- The UI's history endpoint returns the **full message chain** (ignoring `is_compaction` cutoff), not the LLM-view. Two query modes: `getHistory()` for LLM context (stops at compaction), `getFullHistory()` for UI display (walks the entire chain).

---

## Howl as Targeted Learning

Howl is the ghost's voice reaching out. Where chat waits for the user and haunt ignores the user
entirely, howl bridges the gap: the ghost initiates contact when it has a genuine reason. But howl
is not a detached notification system. It is a **targeted learning cycle** expressed as a real
`purpose: "howl"` chat session plus chat-owned delivery metadata.

### Three reasons to howl

**Genuine questions.** The ghost encounters something during chat, haunt, or delegation that it cannot resolve alone. A design decision that needs the user's preference. An ambiguity in a quest that only the user can clarify. A belief that contradicts new evidence and needs a human tiebreaker. The howl carries a specific question and expects a specific answer.

**Critical alerts.** A task detects danger — a deployment failing, a budget about to be exceeded, a secret expiring. The ghost howls with high urgency, triggering immediate delivery to connected channels. This is the closest howl gets to a notification, but the user's response (or dismissal) still feeds back into learning.

**Playful curiosity.** Occasionally, unprompted, the ghost asks something random and light — "what's your favorite pizza?", "do you prefer morning or night work?", "what music are you listening to lately?" These serve two purposes: they fill genuinely useful preference gaps in the ghost's model of the user, and they keep the relationship alive. A ghost that never reaches out is forgotten. A ghost that occasionally pokes you with something fun stays present. This is deliberate engagement design — the howl as a gentle reminder that the ghost exists and cares.

### Howls are born inside sessions

A howl always originates from an active session — a chat, a haunt, a delegation. The ghost is mid-conversation or mid-thought when it realizes it needs something from the user. This means:

- **`origin_session_id`** — which session spawned the howl.
- **`origin_message_id`** — the message position in that session where the howl was triggered. Nullable — howls created programmatically (e.g., from haunt consolidation highlights) may not have a specific message reference.

These two fields are the howl's birth coordinates. They establish where in the ghost's experience the knowledge gap appeared, which is critical for what happens after the user responds.

### The full howl cycle

```
1. Ghost calls `howl(question, urgency)` during origin session X at message M
2. Chat creates a dedicated howl session Y with `purpose = "howl"` and a linked howl metadata row
3. The question is delivered to the best available channel and delivery coordinates are stored
4. The user responds or dismisses; that action is recorded inside howl session Y
5. Harness invokes the warden against the origin context plus the resolved howl session
6. The origin session receives a compact resolution note instead of in-place message surgery
7. Cost stays local to the sessions where work actually happened
```

The key insight is that howl is still chat. The outward question lives in its own session because it
is a real thread with its own lifecycle, delivery state, and explicit resolution, but it remains
anchored to the origin session through parentage and origin coordinates.

Step 4 includes dismissal as a meaningful response. The user clicking "dismiss" is not silence — it is signal. "I don't want to answer this" or "this isn't worth my time" is valuable data. Three dismissals on the same topic is stronger signal than one answer. The warden can learn patterns of non-engagement and adjust the ghost's model of user interests accordingly.

Step 7 closes the loop. The warden runs a persistence pass on the howl interaction: extracting beliefs (memory), updating the pack bond with the user (what topics they engage with, what they dismiss), and reconciling any quest implications. This is what makes howl a learning tool, not an inbox.

### The howl table — DONE

The howl table is **chat-owned routing metadata attached to a real howl session**. The `message`
column still carries the delivery text channels need to send and surfaces need to display, but it no
longer stands alone. Each row points at a dedicated `purpose: "howl"` session that holds the actual
mini-thread.

```sql
CREATE TABLE IF NOT EXISTS howls (
  id                 INTEGER PRIMARY KEY,
  session_id         INTEGER NOT NULL REFERENCES sessions(id),
  origin_session_id  INTEGER NOT NULL REFERENCES sessions(id),
  origin_message_id  INTEGER REFERENCES messages(id),
  message            TEXT    NOT NULL,
  urgency            TEXT    NOT NULL DEFAULT 'low',
  channel            TEXT,
  delivery_address   TEXT,
  delivery_message_id TEXT,
  delivery_mode      TEXT,
  status             TEXT    NOT NULL DEFAULT 'pending',
  created_at         INTEGER NOT NULL,
  responded_at       INTEGER,
  response_message_id INTEGER REFERENCES messages(id)
);
CREATE INDEX IF NOT EXISTS idx_howls_status ON howls(status);
CREATE INDEX IF NOT EXISTS idx_howls_created_at ON howls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_howls_session ON howls(session_id);
CREATE INDEX IF NOT EXISTS idx_howls_origin_session ON howls(origin_session_id);
CREATE INDEX IF NOT EXISTS idx_howls_channel_address ON howls(channel, delivery_address, status);
CREATE INDEX IF NOT EXISTS idx_howls_channel_message ON howls(channel, delivery_message_id, status);
```

The table tracks: the dedicated howl session (`session_id`), where the howl was born
(`origin_session_id`, `origin_message_id`), what to deliver (`message`), how urgent it is, where it
was delivered, and whether the user has addressed it. Reply and dismiss orchestration lives in
`harness/howl/` (`processHowlReply`, `processHowlDismiss`), while the mechanical session and metadata
operations live under `core/chat/`.

### Howl as engagement design

Beyond its learning function, howl is a **retention mechanism**. An AI companion that never initiates contact becomes a tool you open when you need it and forget otherwise. A companion that occasionally reaches out — with something genuinely interesting, a real question, a playful prompt — stays in your mind.

The rate limiting (max per day, cooldown between low-urgency howls) prevents annoyance. The urgency system ensures critical alerts break through while curiosity questions respect boundaries. The playful questions serve double duty: they're fun micro-interactions AND they build the ghost's understanding of the user as a person, not just a task-giver.

This is a USP. Most AI agents are passive receivers. Ghostpaw howls.

---

## What This Changes

### Replaces

- **Automatic memory injection** — DONE. No more per-turn recall sprayed into the system prompt. `recallMemories`, `getTemporalContext`, and all formatting helpers removed from `assembleContext`. The `userMessage` parameter eliminated. System prompt is fully static and cacheable: soul + environment + skill index + tool guidance. Persistence access is explicit and targeted through warden delegation.
- **Distillation as a user concept** — session consolidation (full persistence pass, not memory-only) becomes one of the warden's maintenance tasks. No "Distill Now" button in the UI. The warden handles it.
- **Memory-only consolidation** — DONE. Both session distillation and haunt consolidation previously extracted memories only. The warden consolidates across all three persistence systems: memory, pack, and quests. `consolidateHaunt` and `distillSession` now invoke the warden soul with full warden tools (23 tools), replacing the hardcoded 4-tool memory-only setup. `ConsolidationResult.toolCalls` and `DistillToolCalls` widened to `Record<string, number>` for extensibility.
- **Flat tool surface** — DONE. The coordinator's base tools reduced from 45 to 13 by moving all persistence tools (memory 4, pack 9, quests 8, datetime, recall_haunts) to the warden and all infrastructure tools (config 5, secrets 3, calc) to the chamberlain. Every soul sits safely below the tool-count cliff.
- **The `haunts` table and `core/haunt/` module** — DONE. Haunting is orchestration, not core. Sessions with `purpose = 'haunt'` are the haunt records. The raw journal is the session's messages. The summary is stored as `display_name`. `core/haunt/` eliminated (12 files), data migration copies summaries, `seeded_memory_ids` tracking removed, all SQL boundary violations in `harness/haunt/` fixed.
- **The `delegation_runs` table and `core/runs/` module** — DONE. Delegation runs are child sessions. `soul_id` and `error` columns added. 21 files deleted. `core/chat/` is the single storage layer for all interaction records. All consumers migrated.
- **`core/models/` moved to `lib/`** — DONE. Stateless provider enumeration and model discovery. `listProviders` purified to accept `{ currentModel, configuredKeys }` instead of `DatabaseHandle`. All 7 files moved to `lib/models/`, single consumer (`models_api.ts`) updated.
- **`core/cost/` split into `core/chat/` and `lib/`** — DONE. The `core/cost/` module is eliminated. Query functions (`getSpendInWindow`, `getTokensInWindow`, `getSessionTokens`, `getCostSummary`, `getCostByModel`, `getCostBySoul`, `getCostByPurpose`, `getDailyCostTrend`) and aggregation types (`CostSummary`, `CostByModel`, `CostBySoul`, `CostByPurpose`, `DailyCostEntry`) moved to `core/chat/`. Pure computation (`computeSpendStatus`, `isSpendBlocked`) and the `SpendStatus` type moved to `lib/cost/`. `formatBudgetSummary` and `BudgetNumbers` subsequently deleted (budget summary injection into system prompt eliminated — the chamberlain handles budget awareness through delegation). `getSpendStatus` and `isSpendBlocked` refactored to pure signatures (take `spent: number` instead of DB handle). All consumers updated, zero references to `core/cost/` remain.
- **`core/service/` moved to `lib/`** — DONE. OS-level utility for systemd/launchd/cron service management. All 21 files moved to `lib/service/`, single consumer (`cli/service.ts`) updated.
- **Pack `metadata` JSON blob** — DONE. The freeform JSON column on `pack_members` is eliminated. Contact information moves to the structured `pack_contacts` table with constrained types, validated values, and uniqueness enforcement. No more guessing key names or losing queryability to unstructured data.
- **Token-based hard limits** — DONE. `max_tokens_per_session` and `max_tokens_per_day` config keys removed. `check_token_budget.ts` and `token_budget_error.ts` deleted. The only hard limit is `max_cost_per_day` (dollars). `compaction_threshold` (new config key, default 200K, category "behavior") replaces the old token-per-session concept as an internal orchestration parameter. Telegram session rotation (`executeTurnWithRotation`) eliminated — compaction handles context bounds transparently.
- **Howl as chat-owned outreach** — DONE. Howl is a real `purpose: "howl"` session with chat-owned
  routing metadata under `core/chat/`, not a sibling `core/howl/` subsystem and not a notification
  inbox. The metadata row keeps origin and delivery coordinates (`session_id`, `origin_session_id`,
  `origin_message_id`, `message`, `urgency`, `channel`, delivery fields, `status`). Reply and dismiss
  orchestration lives in `harness/howl/` (`processHowlReply`, `processHowlDismiss`) with warden
  consolidation against the origin context. All consumers updated: Telegram, web API, web client,
  CLI, bootstrap, and the howl tool. The old `core/howl/` namespace is gone.
- **Hard-coded one-shot prompts** — DONE. `CONSOLIDATION_PROMPT` replaced by warden soul invocation with `assembleContext(db, "", { soulId: MANDATORY_SOUL_IDS.warden })` as system prompt and `CONSOLIDATION_INSTRUCTION` as user message. `DISTILL_SYSTEM_PROMPT` replaced the same way with `DISTILL_INSTRUCTION`. Sessions now record `soulId: MANDATORY_SOUL_IDS.warden`. The `rewrite_essence` hard-coded `SYSTEM_PROMPT` replaced by mentor soul invocation: `assembleContext(db, workspace, { soulId: MANDATORY_SOUL_IDS.mentor })` as system prompt, rewrite rules and effective-writing skill content moved into user message, session tagged with `soulId: MANDATORY_SOUL_IDS.mentor`. All oneshot prompts now follow the same pattern: `assembleContext` for the system prompt, task-specific instructions as the user message, session tagged with the invoked soul's ID.

### Introduces

- **The warden as 5th mandatory soul** — DONE. Persistence keeper with dual operator/maintenance role. `warden: 5` in `MANDATORY_SOUL_IDS`, full soul essence (~15 lines) and 2 baseline traits in `DEFAULT_SOULS`, `createWardenTools(db)` exported from `harness/tools.ts` (23 tools: memory 4, pack 9, quests 8, datetime, recall_haunts), warden delegation wired in `delegate.ts` (restricted tool set — no filesystem, web, bash, or delegation), `assembleContext` produces minimal prompt for warden (soul + environment + tool guidance only, no auto-injected memories/quests/skills), `buildTurnArgs` in `entity.ts` routes warden to `toolSets.wardenTools`. Consolidation and distillation invoke the warden soul directly.
- **The chamberlain as 6th mandatory soul** — DONE. Infrastructure governor with authority over config, secrets, budget, and scheduling. `chamberlain: 6` in `MANDATORY_SOUL_IDS`, full soul essence and 2 baseline traits in `DEFAULT_SOULS`, `createChamberlainTools(db)` exported from `harness/tools.ts` (14 tools: config 5, secrets 3, schedule 4, calc, datetime), chamberlain delegation wired in `delegate.ts` (restricted tool set — no filesystem, web, bash, or delegation), `assembleContext` produces minimal prompt for chamberlain (soul + environment + tool guidance only), `buildTurnArgs` in `entity.ts` routes chamberlain to `toolSets.chamberlainTools`.
- **Delegation-first everything** — DONE. The coordinator no longer has any persistence or infrastructure tools. Memory, pack, and quest operations require delegation to the warden. Config, secrets, and calc require delegation to the chamberlain. The coordinator's 13 tools are: filesystem (6), web (2), mcp, sense, howl, delegate, check_run.
- **Per-soul tool surfaces** — DONE. Coordinator: 13 tools. Warden: 23 tools (restricted — no filesystem/web/delegation). Chamberlain: 14 tools (restricted — no filesystem/web/delegation). Mentor: shared + 7 specialist. Trainer: shared + 7 specialist. No soul approaches the degradation zone.
- **Secret isolation** — API keys and credentials exist only within the chamberlain's ephemeral context. No other soul can access or leak them.
- **Scheduling system** — DONE. In-process job scheduler using event-loop timers (`setTimeout`, 30s tick). Single `schedules` table with CAS-based at-most-once locking via `next_run_at` compare-and-swap — guarantees no duplicate execution even with multiple Ghostpaw instances sharing the same database. Jobs spawned as child processes: builtin schedules invoke CLI subcommands (`ghostpaw haunt`, `ghostpaw distill`), custom schedules run arbitrary shell commands via `/bin/sh -c`. Default builtins: `haunt` (30min, disabled by default), `distill` (2h, enabled). Child processes inherit environment (API keys, workspace), tracked in a `Map<id, ChildProcess>` for double-spawn prevention and clean shutdown (SIGTERM, 5s deadline). Dead-process detection via `process.kill(pid, 0)`. Four chamberlain tools: `schedule_list`, `schedule_create`, `schedule_update`, `schedule_delete`. CLI subcommand `ghostpaw schedules` with `list`, `show`, `enable`, `disable`, `create`, `update`, `delete`. `core/schedule/` module (14 source files), `harness/scheduler.ts`, `tools/schedule/` (4 tools), all with colocated tests. Wired into daemon startup (`initScheduleTables`, `ensureDefaultSchedules`, `startScheduler`) and shutdown (`scheduler.stop()` first in sequence).
- **Transparent cascading compaction** — DONE. Automatic, invisible context management on every session. `compaction_threshold` config key (default 200K) controls when compaction fires. `getHistory()` returns post-marker messages for the LLM; `getFullHistory()` returns the complete chain for the UI. Compaction markers create context floors while the user sees the full history. Token counter resets from each marker. Conversations run unbounded in length; the working context stays bounded.
- **Dollar-only hard limit** — DONE. `max_cost_per_day` is the single point of refusal. Token-based limits (`max_tokens_per_session`, `max_tokens_per_day`) eliminated. `check_token_budget.ts` and `token_budget_error.ts` deleted. Per-message cost attribution at generation time ensures historical accuracy regardless of future price changes.
- **Howl learning cycle** — DONE. Howl → deliver → user responds/dismisses → inject Q&A into origin session → warden consolidation in system session (`system:howl-reply:{id}` / `system:howl-dismiss:{id}`). Every howl is a mini persistence pass. The warden extracts beliefs from replies (confidence 0.7-0.8, source "stated") and notes dismissal patterns (confidence 0.5, source "observed"). Dismissal is signal — three dismissals on the same topic is stronger signal than one answer.
- **Pack contacts table** — DONE. Structured `pack_contacts` with constrained type enum, `UNIQUE(type, value)` for identity resolution, forward/reverse lookup, and cross-channel recognition. Replaces the freeform `metadata` JSON blob on `pack_members`.
- **Pack member merging** — DONE. `mergeMember(keepId, mergeId)` operation for the warden: moves interactions and contacts, merges temporal bounds, trust, and bond narratives, soft-deletes the merged record. Duplicate detection via shared contacts and fuzzy name matching during maintenance.
- **Pack user flag** — DONE. `is_user` boolean on pack table with partial unique index. Exactly one active pack member is the human owner. Eliminates attribution ambiguity in consolidation.

### Preserves

- **The soul system** — all six mandatory souls participate in the same evolutionary mechanics. Traits, leveling, dormancy, mentor refinement. The warden and chamberlain are mentorable like every other soul.
- **The delegation mechanics** — `delegate.ts` supports soul-specific tool sets. The warden and chamberlain both use *restricted* tool sets (they get ONLY their own tools, not shared + specialist). Mentor and trainer get shared + specialist tools.
- **Play modes** — chat, haunt, howl as the three directions of play. Chat (user → ghost) is unchanged. Haunting simplifies: it's a background session with purpose "haunt", not a separate system. Howl refactors: the dedicated howl session is eliminated, the table tracks origin coordinates (`origin_session_id`, `origin_message_id`) plus a delivery payload (`message`), and howl Q&A pairs inject back into origin sessions for complete records and warden consolidation. Reply/dismiss orchestration lives in `harness/howl/`, fixing the core→harness layer violation. The difference across all modes is how they access persistence and infrastructure: delegation instead of direct tools.
- **Everything in core/ (except haunt, runs, and cost)** — the persistence modules (memory, pack, quests) and config/secrets modules are unchanged. The warden and chamberlain use the same tools that previously lived on the coordinator. Three core modules get eliminated: `core/runs/` (DONE — redundant with sessions), `core/cost/` (DONE — query functions folded into `core/chat/`, pure computation moved to `lib/cost/`), and `core/haunt/` (DONE — redundant with sessions). `core/chat/` gains `soul_id`/`error` columns plus all cost query functions and becomes the universal interaction and cost record. The change is at the harness/orchestration level, not the core level.
- **The haunt thesis** — the generation condition, the two-phase separation (thinking then consolidation), the seed diversity engine, the research foundation. All preserved. The simplification is structural (sessions replace a dedicated table), not conceptual.

---

## The Theme Holds

The four aspects map to how you experience the ghost. Every aspect now has a dedicated soul.

**Evolution** is the RPG layer. Souls are character sheets. Traits are earned abilities. Level-up is genuine progression. Skills are the ecosystem. The party of souls each grows independently. The **mentor** and **trainer** are the meta-characters who improve the improvement process itself.

**Persistence** is the continuity layer. Memory is the ghost's beliefs. Pack is its social world. Quests are its commitments in time. The **warden** is the keeper of all three — the soul that maintains the ghost's accumulated world.

**Play** is the interaction layer. Three directions: Chat is the user reaching in (user → ghost). Haunt is the ghost alone (ghost ↔ world). Howl is the ghost reaching out (ghost → user) — a targeted learning probe that fills knowledge gaps, flags danger, and keeps the relationship alive through playful curiosity. **Ghostpaw** itself is the coordinator — the ghost's voice and will. The **js-engineer** is the first specialist, ready from day one.

**Infrastructure** is the system menu. Config, secrets, costs, scheduling. The **chamberlain** governs this domain — holding the keys, controlling the purse, managing the schedule. A role of real authority, not a servant. The ghost's binding to operational reality.

Six mandatory souls. Four aspects. Every soul below the tool-count cliff. Every delegation a leaf call. Every interaction the same primitive: soul, tools, instruction, result.

The spectral wolf contains souls, carries memories, knows its pack, tracks its quests, haunts its territory, howls when it has something to say, and grows from everything it experiences. The warden keeps its inner world. The chamberlain keeps its outer bindings. The mentor sharpens its identity. The trainer builds its skills. Every module earns its place in that sentence. Nothing is bolted on. Nothing breaks the metaphor. The theme isn't naming — it's architecture.

---

## References

### Tool Count and Selection

- [We removed 80% of our agent's tools](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools) — Vercel, Dec 2025. 16 tools → bash-only: 80% → 100% success, 3.5x faster, 37% fewer tokens, 42% fewer steps. The landmark case for radical tool simplification.
- [MCP-Atlas](https://arxiv.org/abs/2602.00933) — Jan 2026. 36 MCP servers, 220 tools, 1,000 tasks. Best model achieves 62.3% pass rate. Establishes baseline for realistic tool-use competency at scale.
- [BiasBusters](https://arxiv.org/abs/2510.00307) — Microsoft Research, ICLR 2026. Systematic position bias in tool selection across 7 models. Earlier-listed tools disproportionately chosen. Fewer tools = less surface for bias.
- [ToolScope](https://arxiv.org/abs/2510.20036) — Oct 2025. Tool merging and context-aware filtering. 8-38% accuracy gains by reducing semantic ambiguity from overlapping tool descriptions.
- [AI Tool Overload: Why More Tools Mean Worse Performance](https://www.jenova.ai/en/resources/mcp-tool-scalability-problem) — Production threshold data. Performance cliff at 10-20 tools, complete failure at 40+.
- [MCP and Context Overload](https://eclipsesource.com/blogs/2026/01/22/mcp-context-overload/) — 3-4 MCP servers consume 15-20K tokens in tool definitions alone. 25% of context before work begins.

### Dynamic Tool Routing and Sub-Agents

- [Dynamic System Instructions and Tool Exposure (ITR)](https://arxiv.org/abs/2602.17046) — Feb 2026. 95% reduction in per-step context tokens, 32% improvement in correct routing, 70% cost reduction, 2-20x more agent loops within context limits.
- [SkillOrchestra](https://arxiv.org/abs/2602.19672) — Feb 2026. Skill-aware agent routing: 22.5% performance improvement over RL orchestrators, 700x cost reduction in learning.
- [Context7 Sub-Agent Redesign](https://medium.com/codex/context7s-game-changing-architecture-redesign-how-sub-agents-slashed-token-usage-by-65-9dbd16d1a641) — Feb 2026. 65% token reduction through specialized sub-agents with isolated contexts.
- [Anthropic Sub-Agents](https://docs.anthropic.com/en/docs/claude-code/sdk/subagents) — Claude Code SDK. Orchestrator-Worker pattern with context isolation and tool restrictions. 90%+ improvement on complex tasks.
- [Advanced Tool Use on Claude](https://www.anthropic.com/engineering/advanced-tool-use) — Anthropic, Nov 2025. Tool Search Tool preserves up to 191,300 tokens versus loading all tool definitions upfront.
- [Team of Thoughts](https://arxiv.org/abs/2602.16485) — Feb 2026. Heterogeneous models as specialized tools with dynamic orchestration. 96.67% on AIME24 vs. 80% baseline.

### Context Economics and Compression

- [AI Agent Cost Optimization](https://zylos.ai/research/2026-02-19-ai-agent-cost-optimization-token-economics) — Zylos, Feb 2026. Agents consume 3-10x more LLM calls than chatbots. Output tokens cost 3-8x more than input. A 10-cycle ReAct loop consumes 50x tokens vs. single pass.
- [OpenClaw Cost Deep Dive](https://openclawpulse.com/openclaw-api-cost-deep-dive/) — 2026. Context replay is 40-50% of cost. Tool output storage is 20-30%. Users report 1-3M tokens in minutes, $3,600/month.
- [ACON](https://arxiv.org/abs/2510.00615) — Oct 2025, ICLR 2026. Context compression for long-horizon agents: 26-54% peak token reduction, up to 46% accuracy improvement on smaller models.
- [Prompt Caching for AI Agents](https://zylos.ai/research/2026-02-24-prompt-caching-ai-agents-architecture) — Zylos, Feb 2026. 50-90% cost reduction on cached tokens, 50-85% latency reduction. Requires static prefixes — dynamic injection breaks caching.
- [Reducing OpenClaw Heartbeat Token Usage](https://rezhajul.io/posts/reducing-openclaw-heartbeat-token-usage/) — Heartbeats cost $1-5/day at default settings. Isolated sessions eliminate background burn.

### Retrieval and Memory

- [Beyond RAG: Building Memory Injections](https://pub.towardsai.net/beyond-rag-building-memory-injections-for-your-ai-assistants-ceedcea20419) — Feb 2026. Traditional RAG is reactive and wasteful. Proactive, targeted injection outperforms blanket retrieval.
- [MemR3: Memory Retrieval via Reflective Reasoning](https://arxiv.org/html/2512.20237v1) — Dec 2025. Router decides whether to retrieve before doing so. Evidence-gap tracker prevents redundant lookups.
- [Diagnosing Retrieval vs. Utilization Bottlenecks](https://arxiv.org/abs/2603.02473) — Mar 2026. Retrieval method dominates performance: 20-point accuracy variance across retrieval methods vs. 3-8 points across write strategies.
- [Zero-Waste Agentic RAG](https://towardsdatascience.com/zero-waste-agentic-rag-designing-caching-architectures-to-minimize-latency-and-llm-costs-at-scale/) — 30%+ of enterprise queries are repetitive. Semantic caching intercepts before agent invocation.

### Industry Trends

- [More Agents, More Tools, Worse Results](https://medium.com/@stawils/more-agents-more-tools-worse-results-the-2026-evidence-for-radical-simplification-7bad6c1858a5) — Feb 2026. The evidence for radical simplification in agentic systems.
- [AI Agent Sprawl: Why 2026 Is the Year of Consolidation](https://www.adai.news/p/ai-agent-sprawl-consolidation-2026) — SMBs losing $18K/employee/year to overlapping AI tools. Major platforms consolidating.
- [Stop Drowning Your Agent in Tools](https://kvg.dev/posts/20260110-tool-bloat-ai-agents/) — Jan 2026. Practical guide to tool bloat in production agents. Tool definitions consuming 50-70% of available context.
