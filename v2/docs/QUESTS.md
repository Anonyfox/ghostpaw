# Quests

Quests are the ghost's record of what needs doing and what actually happened — a unified model for tasks, events, deadlines, and recurring commitments. Not a calendar with tasks bolted on. Not a todo list with dates bolted on. One entity that can express any temporal intention through optional fields on a single schema.

Memory stores what the ghost believes. Souls define how it thinks. Skills determine what it can do. Pack tells it who matters. Quests tell it what's happening — what's due, what's overdue, what's coming, what was done, and what was missed. Without quests, the ghost has identity but no agenda. It knows the world but can't track its commitments to it.

---

## Why This Matters

Every agent framework treats task management as an external concern — the human maintains a todo list somewhere, and the agent reads it when asked. This creates three gaps:

**No temporal awareness.** The ghost doesn't know that a deployment is due Friday, that the user's birthday is next week, or that a recurring standup happens every morning. Without structured temporal data, the ghost can't reason about time. It can't prioritize urgency. It can't proactively surface what matters today versus next month. Haunting produces richer output when the ghost knows what's coming — an approaching deadline changes what's worth thinking about.

**No bidirectional task flow.** The human creates tasks. The ghost should too — during work decomposition, during haunting, during any moment it identifies something that needs tracking. And the ghost should be able to mark things done, log events that occurred, and update deadlines based on reality. A task system that only flows from human to agent is half a system.

**No action log.** Memory stores beliefs. But "deployed v2.3 on Tuesday" is not a belief — it's a fact anchored in time. "Had a difficult conversation with the client on March 1st" is not a preference — it's an event. These temporal facts need a home that isn't memory, because they have different semantics: they don't decay with confidence, they don't need embedding search, they need calendar-aware queries. What happened when is a different question from what do I believe.

Research confirms the cost of fragmentation: professionals using separate calendar and task systems lose ~6 hours weekly to context switching, with 23 minutes average refocus time per switch ([Akiflow, 2026](https://akiflow.com/blog/calendar-task-management-integration-productivity)). For an LLM agent, context switching is even more expensive — every tool call to check a separate system burns tokens and attention.

## The Unified Model

The core insight: tasks and events are not different types. They are the same entity with different metadata populated.

| What it looks like | What it actually is |
|---|---|
| A todo item | A quest with no temporal metadata |
| A deadline | A quest with a `due_at` timestamp |
| A calendar event | A quest with `starts_at` and `ends_at` |
| A recurring commitment | A quest with a recurrence rule |
| A reminder | A quest with a `remind_at` timestamp |
| A completed action | A quest in `done` state with a completion timestamp |
| A logged event | A quest created retroactively in `done` state |

One table. One schema. One set of tools. The LLM doesn't need to decide whether something is a "task" or an "event" — it creates a quest and populates whichever fields apply. This eliminates the integration problem entirely because there is nothing to integrate.

The anti-pattern to avoid is the "calendar trap" — forcing every task into a time slot. 42% of professionals do this and it fails ([PaperlessMovement, 2025](https://paperlessmovement.com/articles/the-calendar-trap-why-your-task-management-system-needs-a-complete-overhaul)). Tasks without deadlines are legitimate. Events without todos are legitimate. The unified model supports both by making temporal fields optional, not structural.

## Research Foundation

### Calendar-todo fusion requires unified architecture

Systems that bolt task views onto calendars (or vice versa) consistently underperform purpose-built unified systems. The most successful designs treat calendar and tasks as "one unified app architected together from the ground up" rather than two systems with a sync layer ([Akiflow, 2026](https://akiflow.com/blog/calendar-task-management-integration-productivity); [Khotta, 2025](https://khotta.io/blog/15/)).

### RRULE is the standard for recurrence

The iCalendar RRULE format (RFC 5545) is the gold standard for expressing recurrence patterns — "every third Thursday March–June," "second Sunday in May," bounded or infinite. Every practitioner and every Stack Overflow thread says the same thing: don't reinvent recurrence rules ([codegenes.net](https://www.codegenes.net/blog/calendar-recurring-repeating-events-best-storage-method/); [Onderbeke](https://wimonder.dev/posts/adding-recurrence-to-your-application)). Store rules as text, compute instances dynamically. For a single-user system, no lookahead window needed — compute on query.

### AI agents need structured temporal task storage

Microsoft's CORPGEN framework (Feb 2026) identified four failure modes when AI agents manage concurrent tasks: context saturation (O(N) memory growth), memory interference (cross-task contamination), dependency graph complexity (tasks form DAGs, not chains), and reprioritization overhead ([Microsoft Research, 2026](https://www.microsoft.com/en-us/research/publication/corpgen-simulating-corporate-environments-with-autonomous-digital-employees-in-multi-horizon-task-environments/)). Structured task storage with clear state tracking directly addresses all four — the agent queries what's active rather than holding everything in context.

### Temporal knowledge graphs enable time-aware reasoning

Zep's Graphiti architecture achieves 94.8% accuracy on deep memory retrieval and 18.5% improvement on temporal reasoning by maintaining timestamped relationship graphs ([arXiv:2501.13956](https://arxiv.org/html/2501.13956v1)). Quests are simpler than a full knowledge graph but serve the same purpose: anchoring facts in time so the agent can reason about temporal relationships.

### Proactive agents need temporal triggers

The field is transitioning from reactive to proactive agent architectures. Autonomous wake-up scheduling — agents that self-schedule based on temporal conditions — is identified as a foundational capability for 2026 ([Zylos Research, 2026](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents)). Quests with due dates and reminders provide the temporal triggers that make proactive behavior possible without polling or cron jobs.

### Separate reliability from personality

RecallAgent (Mem0 + Claude) demonstrates the right separation: facts about tasks live in structured storage; learned patterns about how the user works live in memory ([dev.to, 2025](https://dev.to/mem0/building-memory-first-ai-reminder-agents-with-mem0-and-claude-agent-sdk-3380)). Quest state (what's due when, what's done) is structured data. The ghost's understanding of how the human prioritizes, which deadlines are soft vs. hard, and when reminders actually help — that's memory. Different systems, different semantics, reinforcing each other.

### Hill Charts over percentage tracking

Basecamp's core insight: task counts are misleading because tasks are not equal and work is discovered during execution. Hill Charts model progress as two phases — "figuring it out" (uphill, unknown) and "execution" (downhill, known). Human judgment positions the status, not automated calculation ([Basecamp](https://basecamp.com/hill-charts)). Quest logs adopt this principle: progress is the ratio of done quests to total, but the meaningful signal is which quests are blocked, which are active, and whether the unknowns have been resolved.

## What a Quest Is

A quest is a single row in the `quests` table. Title and status are required. Everything else is optional — populated fields determine what the quest expresses.

All timestamps are Unix milliseconds (`Date.now()`) — the same convention used by every other Ghostpaw table. No ISO strings in storage. Formatting is a code concern.

### Schema

```sql
CREATE TABLE IF NOT EXISTS quests (
  -- identity
  id            INTEGER PRIMARY KEY,
  title         TEXT    NOT NULL,
  description   TEXT,
  -- state
  status        TEXT    NOT NULL DEFAULT 'pending'
                CHECK(status IN ('offered','pending','active','blocked','done','failed','cancelled')),
  priority      TEXT    NOT NULL DEFAULT 'normal'
                CHECK(priority IN ('low','normal','high','urgent')),
  -- grouping
  quest_log_id  INTEGER REFERENCES quest_logs(id),
  tags          TEXT,
  -- lifecycle
  created_at    INTEGER NOT NULL,
  created_by    TEXT    NOT NULL DEFAULT 'human',
  updated_at    INTEGER NOT NULL,
  -- temporal
  starts_at     INTEGER,
  ends_at       INTEGER,
  due_at        INTEGER,
  remind_at     INTEGER,
  reminded_at   INTEGER,
  completed_at  INTEGER,
  -- recurrence
  rrule         TEXT
)
```

| Field | Purpose |
|---|---|
| `title` | What this quest is about. Human-readable, agent-writable. |
| `description` | Longer context. Markdown. |
| `status` | Current state — CHECK-constrained to seven valid values. |
| `priority` | Urgency level — CHECK-constrained to four valid values. Default `normal`. |
| `quest_log_id` | FK to `quest_logs`. Null = standalone quest. |
| `tags` | Comma-separated labels for filtering. |
| `created_at` | When created. Set once on insert. |
| `created_by` | Who created it: `"human"` or `"ghost"`. Default `"human"`. |
| `updated_at` | Last modification. Updated on every write. |
| `starts_at` | When this begins. Populated for events. |
| `ends_at` | When this ends. Populated for events with duration. |
| `due_at` | When this is due. Populated for deadlines. |
| `remind_at` | When to surface this. Populated for reminders. |
| `reminded_at` | When the ghost last surfaced this reminder. Enables snooze: updating `remind_at` to a later time resets the cycle because `reminded_at < remind_at` again. |
| `completed_at` | When finished. Set automatically on terminal transition. |
| `rrule` | iCalendar RRULE string. Populated for recurring quests. |

No JSON columns. No metadata blobs. Every meaningful field is a typed column with clear semantics. If a future need arises, it gets a column via migration — not a key in a bag.

### State Machine

Seven states, clear transitions:

```
     ┌──────────┐
     │ offered  │──── accept ──┐
     └────┬─────┘              │
          │ dismiss             │
          ▼                    ▼
     ┌──────────┐        ┌─────────┐
     │cancelled │   ┌───>│ pending │
     └──────────┘   │    └────┬────┘
                    │         │
                    │    ┌────▼────┐
                    │    │  active  │────────┐
                    │    └────┬────┘        │
                    │         │             │
                    │    ┌────▼─────┐  ┌────▼─────┐
                    │    │  blocked  │  │   done    │
                    │    └──────────┘  └──────────┘
                    │
                    │    ┌──────────┐
                    │    │  failed   │
                    │    └──────────┘
                    │
                    direct create
```

| State | Meaning |
|---|---|
| `offered` | On the Quest Board — proposed or quick-dumped, not yet accepted |
| `pending` | Accepted, not yet started |
| `active` | In progress |
| `blocked` | Waiting on something external |
| `done` | Completed successfully |
| `failed` | Attempted and failed |
| `cancelled` | Abandoned intentionally |

Terminal states: `done`, `failed`, `cancelled`. The `offered` state is the Quest Board inbox — quests land here from ghost proposals or human quick-dumps before being accepted into the active quest log. Offered quests are excluded from temporal context and progress tracking. Non-terminal states can transition to any other state. Every transition updates `completed_at` (for terminal states) or relevant temporal fields. Retroactively logged events enter directly as `done`. Quests can also be created directly as `pending`, bypassing the board.

### The Quest Board

The Quest Board is an unsorted inbox for ideas, proposals, and recommendations that haven't been accepted into active tracking. It sits alongside the Quest Log and Storylines as a first-class view.

Two origins, two icons:
- **`!`** (yellow exclamation) — `createdBy: ghost`. The ghost is proposing: "I found something worth doing."
- **`?`** (yellow question mark) — `createdBy: human`. The human quick-dumped an idea: "Maybe I should do this."

These icons are visual only — both are `status: offered`, distinguished by `createdBy`. No new columns needed.

**Lifecycle on the board:**
- **Accept** → transitions to `pending`, optionally assigns to a quest log
- **Dismiss** → transitions to `cancelled`

The board is deliberately unstructured. No sorting, no priority enforcement, no deadlines nagging. It's a holding pen where things can sit indefinitely until the human or ghost decides they matter enough to accept — or don't, and they get dismissed. This is the RPG equivalent of the town bulletin board where random NPCs post notices.

### Recurrence

Recurring quests store the RRULE on a base quest. When queried for a time range, the system computes occurrences dynamically from the rule. Individual occurrences are tracked in the `quest_occurrences` table — completion of one occurrence does not affect others or the base quest.

```sql
CREATE TABLE IF NOT EXISTS quest_occurrences (
  id            INTEGER PRIMARY KEY,
  quest_id      INTEGER NOT NULL REFERENCES quests(id),
  occurrence_at INTEGER NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'done'
                CHECK(status IN ('done','skipped')),
  completed_at  INTEGER NOT NULL,
  UNIQUE(quest_id, occurrence_at)
)
```

| Field | Purpose |
|---|---|
| `quest_id` | FK to the recurring base quest. |
| `occurrence_at` | Which occurrence this tracks (the computed timestamp from RRULE). |
| `status` | Whether this occurrence was completed or skipped. |
| `completed_at` | When this occurrence was marked. |

RRULE examples:
- `FREQ=DAILY` — every day
- `FREQ=WEEKLY;BYDAY=MO,WE,FR` — Monday, Wednesday, Friday
- `FREQ=MONTHLY;BYDAY=2TU` — second Tuesday of every month
- `FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=6` — March 6th every year
- `FREQ=WEEKLY;COUNT=10` — weekly, 10 times total
- `FREQ=DAILY;UNTIL=20260401T000000Z` — daily until April 1st

No custom recurrence format. RRULE handles every pattern needed, is well-documented, and parseable by standard libraries.

## What a QuestLog Is

A quest log groups related quests into a named project, direction, or theme. It is the organizational layer — what Basecamp calls a "scope," what RPGs call a "quest chain."

### Schema

```sql
CREATE TABLE IF NOT EXISTS quest_logs (
  id            INTEGER PRIMARY KEY,
  title         TEXT    NOT NULL,
  description   TEXT,
  status        TEXT    NOT NULL DEFAULT 'active'
                CHECK(status IN ('active','completed','archived')),
  created_at    INTEGER NOT NULL,
  created_by    TEXT    NOT NULL DEFAULT 'human',
  updated_at    INTEGER NOT NULL,
  completed_at  INTEGER,
  due_at        INTEGER
)
```

| Field | Purpose |
|---|---|
| `title` | Name of this project/direction. |
| `description` | What this quest log is about. Markdown. |
| `status` | Lifecycle state — CHECK-constrained to three valid values. |
| `created_at` | When created. Set once. |
| `created_by` | Who created it: `"human"` or `"ghost"`. |
| `updated_at` | Last modification. Updated on every write. |
| `completed_at` | When finished. Set on terminal transition. |
| `due_at` | Optional deadline for the entire quest log. |

Quest logs are flat — no nesting. A quest belongs to at most one quest log. Quest logs without quests are allowed (placeholder for future work). Quest logs with all quests in terminal states can be marked `completed` or `archived`.

The difference between `completed` and `archived`: completed means the work was done. Archived means the direction was shelved. Both are terminal but carry different meaning. Archived quest logs can be reactivated.

### Progress

Progress is computed, not stored:
- `total` — count of all quests in the log
- `done` — count of quests in terminal states (`done`, `failed`, `cancelled`)
- `active` — count of quests in `active` or `blocked` states
- `pending` — count of quests in `pending` state

No percentage stored. No hill chart position stored. The raw counts tell the truth. The LLM or UI can interpret them.

## Temporal Context

The quest system's primary contribution to the agent is **temporal awareness** — the ability to reason about what's happening in time.

### Context Assembly

Before every turn, the context module queries quests and injects a temporal summary:

- **Overdue** — quests with `due_at` in the past and status not terminal
- **Due soon** — quests with `due_at` within the next 48 hours
- **Today's events** — quests with `starts_at` today
- **Active quests** — quests in `active` or `blocked` state
- **Pending reminders** — quests with `remind_at` in the past and (`reminded_at` is null or `reminded_at < remind_at`)

This summary is compact — a few lines of structured text, not the full quest database. It gives the ghost a sense of "what's happening now" without consuming excessive context tokens.

### Haunting Integration

During haunting, temporal context becomes richer:

- **Upcoming week** — everything with temporal metadata in the next 7 days
- **Stale quests** — quests in `active` state with no update for 7+ days
- **Recurring patterns** — what's due to recur in the upcoming period
- **Completed recently** — what was accomplished in the past 48 hours

This gives the haunt cycle material to work with. A ghost that knows a deadline is approaching thinks differently about what's worth investigating. A ghost that sees stale active quests might proactively ask the human about them. Temporal awareness feeds the same curiosity mechanisms described in HAUNT.md — specific gaps in the ghost's knowledge of what's happening next.

### Proactive Messaging

Quests with `remind_at` timestamps enable time-triggered outbound messages. During haunting or at wake-up, the ghost checks for pending reminders and surfaces them through the appropriate channel. This is not a cron job — the ghost evaluates the reminder in context and decides how to present it, informed by its soul, its bond with the human, and the surrounding temporal landscape.

Rate limiting from the haunting system applies. The ghost doesn't spam reminders. It incorporates them into its judgment about what's worth interrupting for.

## The Module

`core/quests/` is a standalone module following the same pattern as `core/memory/`, `core/souls/`, and `core/pack/`.

**Depends on:** `lib/` (database handle, terminal output). Nothing else in core.

**Provides:**

- Create, read, update quests (with automatic `updated_at` on every write)
- Transition quest state with automatic `completed_at` on terminal transitions
- Create, read, update quest logs
- Query quests by status, by quest log, by time range, by priority
- Query temporal context (overdue, due soon, today's events, active, reminders)
- Track individual recurrence occurrences via `quest_occurrences`
- List quest logs with computed progress counts
- Full-text search across quest titles and descriptions

**Does not provide:** Context assembly (that's `harness/`), tool definitions (that's `tools/`), proactive messaging logic (that's `harness/haunt/`). The quest module is a structured temporal data store with query capabilities.

### Tools

Eight tools cover every operation. Each works as an agent tool, a CLI command, and a web UI action.

**quest_create** — Create a new quest. Title required, everything else optional. Optional `status: "offered"` to place on the Quest Board instead of the active log. Returns the created quest with ID.

**quest_update** — Update any quest field. All temporal fields are Unix ms integers — the LLM computes timestamps, the tool stores them. No date parsing, no format ambiguity. Status transitions are validated (terminal states require explicit intent to reopen).

**quest_list** — Query quests by filter, or search by keyword. Supports `excludeStatuses` to hide board/terminal quests by default. An optional `query` parameter triggers full-text search across titles and descriptions. One tool for both browsing and searching.

**quest_done** — Mark a quest (or a specific recurrence occurrence) as completed. For non-recurring quests: sets status to `done` and `completed_at` to now. For recurring quests with an `occurrence_at` parameter: records the occurrence completion in `quest_occurrences` without affecting the base quest. For recurring quests without `occurrence_at`: marks the entire series done.

**quest_accept** — Accept an offered quest from the Quest Board. Transitions `offered → pending`. Optionally assigns to a quest log.

**quest_dismiss** — Dismiss an offered quest from the Quest Board. Transitions `offered → cancelled`.

**questlog_create** — Create a new quest log. Title required.

**questlog_list** — List quest logs with computed progress. Filter by status.

Minimal surface area. The ghost doesn't need 15 quest tools. It needs to create, update, complete, accept, dismiss, and query. Everything else is a query parameter.

## A Gamer's Guide to Quests

The naming is not cosmetic. RPG quest systems solve the exact same design problem: tracking what needs doing across multiple independent storylines with dependencies, deadlines, and varying priority.

### The Quest Log

Every RPG player knows the quest log. Open it, see what's active, what's completed, what's available. Quests are grouped by storyline. Each has a title, a description, objectives, and status. The quest log is the single place where "what am I doing and why" lives.

Ghostpaw's quest logs are literally this. A quest log named "Website Redesign" is a storyline. The quests inside it are objectives. Opening the quest log shows what's done, what's active, what's pending. The metaphor is instant — no onboarding needed.

### Main Quests vs. Side Quests

Quest logs with deadlines and high-priority quests are main quests — the critical path. Quest logs without deadlines or with low-priority items are side quests — valuable but not urgent. The system doesn't enforce this distinction through types. It emerges naturally from which fields are populated — `due_at` and `priority` tell the story.

A ghost that sees a main quest deadline approaching and a side quest that's been idle for weeks makes the same judgment any player would: focus on the main quest, maybe mention the side quest is gathering dust.

### Quest States as RPG Status

| Quest State | RPG Equivalent | Icon |
|---|---|---|
| `offered` | Quest on the bulletin board — `!` from NPC, `?` from player | `!` / `?` |
| `pending` | Quest accepted, in the quest log | — |
| `active` | Quest in progress | — |
| `blocked` | Quest waiting on prerequisite | — |
| `done` | Quest completed, rewards earned | — |
| `failed` | Quest failed, consequences applied | — |
| `cancelled` | Quest abandoned or dismissed | — |

### Recurring Quests as Dailies and Weeklies

Every MMO player understands dailies and weeklies — tasks that reset on a schedule. Ghostpaw's recurring quests are exactly this. `FREQ=DAILY` is a daily quest. `FREQ=WEEKLY;BYDAY=MO` is a Monday weekly. The RRULE system can express any reset schedule, but the mental model is familiar: some quests come back.

### The Bulletin Board

The ghost's temporal context summary — overdue quests, upcoming deadlines, today's events — is the bulletin board in the town square. Every time the ghost wakes up (new turn or haunt cycle), it checks the board. What's urgent? What's new? What did I miss? The board is always current because it's computed from live data, not cached.

### XP Is Real

In the soul system, completed quests ARE the evidence that drives trait acquisition. The js-engineer soul that completed 50 code quests has earned traits from those completions. The coordinator that successfully managed a quest log through to completion has evidence for better routing judgment. Quest completion isn't fake gamification XP — it is the actual input to the evolutionary system described in SOULS.md.

This is the connection between quests and souls that makes the RPG metaphor structurally honest: completing quests literally makes the ghost stronger, through the same evidence-driven refinement that the soul system already implements. No bolt-on reward system needed. The reward is genuine cognitive improvement.

## What Quests Do Not Store

**Beliefs.** "The user prefers TypeScript" is a memory, not a quest. Quests are actions and events, not knowledge.

**Relationships.** "The user was frustrated during the deploy" is a pack interaction, not a quest. The quest records "Deployed v2.3" as a completed event. The emotional context lives in the bond.

**Procedures.** "How to deploy" is a skill. "Deploy v2.3 by Friday" is a quest. The quest tracks the commitment; the skill tracks the knowledge.

**Conversation history.** "We discussed the migration" is a session. Quests may reference sessions ("see session #42 for context") but don't replace them.

## The Compound

Day 1 — the quest system is empty. The ghost tracks nothing. It responds to what's in front of it.

Week 2 — the human has created a few quest logs. The ghost sees upcoming deadlines in its temporal context. During haunting, it notices a stale quest and asks about it. It starts creating its own quests during work decomposition — breaking a large task into tracked steps.

Month 2 — dozens of completed quests provide evidence for soul refinement. The ghost has learned the human's patterns: which deadlines are real, which are aspirational. Recurring quests establish rhythm. The temporal context summary is rich enough that the ghost proactively manages time — "you have three things due this week, want me to prioritize?"

Month 6 — the quest history is a structured log of everything that happened and when. The ghost's temporal reasoning is grounded in months of pattern data. It knows that Friday deploys always slip to Monday. It knows the user forgets recurring tasks unless reminded Wednesday. This knowledge lives in memory, informed by quest data. The quest system provides the facts. Memory provides the interpretation. Together they give the ghost something no other agent has: a genuine sense of time passing and commitments within it.

## References

### Calendar-Task Integration
- [Akiflow: Calendar Task Management Integration](https://akiflow.com/blog/calendar-task-management-integration-productivity) — 16+ apps, 6 hours lost weekly, 23 min refocus time. Unified systems outperform bolted-on integrations.
- [The Calendar Trap](https://paperlessmovement.com/articles/the-calendar-trap-why-your-task-management-system-needs-a-complete-overhaul) — 42% of professionals misuse calendars as task managers. Time-slot forcing creates rescheduling overhead and anxiety.
- [Khotta: Calendar + Todoist Fusion](https://khotta.io/blog/15/) — Bidirectional integration as core architecture, not afterthought.

### Recurrence and Data Model
- [RFC 5545: iCalendar Specification](https://tools.ietf.org/html/rfc5545) — VEVENT, VTODO, RRULE. The standard for representing calendar and task data.
- [Task Extensions to iCalendar](https://www.ietf.org/archive/id/draft-ietf-calext-ical-tasks-17.html) (Dec 2025 draft) — Enhanced VTODO for project management and automated systems.
- [Calendar Recurring Events: Best Storage Method](https://www.codegenes.net/blog/calendar-recurring-repeating-events-best-storage-method/) — Hybrid approach: store rules + compute instances. RRULE over CRON.
- [Adding Recurrence to Your Application](https://wimonder.dev/posts/adding-recurrence-to-your-application) — RRULE format, exclusion records, practical schema design.

### AI Agent Task Management
- [CORPGEN](https://www.microsoft.com/en-us/research/publication/corpgen-simulating-corporate-environments-with-autonomous-digital-employees-in-multi-horizon-task-environments/) (Microsoft Research, Feb 2026) — Four failure modes in multi-task agent environments. Hierarchical planning + tiered memory achieves 3.5× improvement.
- [Autonomous Task Scheduling for AI Agents](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents) (Zylos, Feb 2026) — Reactive-to-proactive transition. Autonomous wake-up scheduling as foundational capability.
- [Zep: Temporal Knowledge Graph for Agent Memory](https://arxiv.org/html/2501.13956v1) — 94.8% accuracy on deep memory retrieval. Timestamped relationships enable temporal reasoning.
- [MACI: Multi-Agent Collaborative Intelligence](https://arxiv.org/abs/2501.16689) — Adaptive temporal planning via meta-planner with dependency graphs.

### Memory and Temporal Context
- [Memory as Action](https://arxiv.org/abs/2510.12635) — Working memory as learnable policy actions for long-horizon tasks.
- [O-Mem: Omni Memory for Personalized Agents](https://arxiv.org/html/2511.13593v2) — Hierarchical retrieval of persona and temporal context.
- [Building Memory-First AI Reminder Agents](https://dev.to/mem0/building-memory-first-ai-reminder-agents-with-mem0-and-claude-agent-sdk-3380) — Separate reliability (structured storage) from personalization (learned patterns).

### Task System Design
- [Basecamp Hill Charts](https://basecamp.com/hill-charts) — Two-phase progress: figuring it out vs. executing. Human judgment over automated metrics.
- [Shape Up: Map the Scopes](https://basecamp.com/shapeup/3.3-chapter-12) — Integrated slices of work organized by structure, not by person.
- [Quest System Design Patterns](https://rpgpatterns.soe.ucsc.edu/doku.php?id=patterns:questindex) — Three layers: quest types, quest patterns, quest superstructure.
- [The Quest for the Custom Quest System](https://www.gamedeveloper.com/design/the-quest-for-the-custom-quest-system) — 8 task types, 12 structural patterns, 2 superstructures. Data-driven over hardcoded.

### Gamification Lessons
- [Habitica Gamification Case Study](https://trophy.so/blog/habitica-gamification-case-study) — Direct task-consequence integration works. Long-term retention requires genuine depth beyond mechanics.
- [Habitica Retention Strategies](https://building.theatlantic.com/leveling-up-your-habits-a-deep-dive-into-habiticas-retention-strategies-fc139acf3429) — Multi-layered progression, social accountability, personalized rewards.
