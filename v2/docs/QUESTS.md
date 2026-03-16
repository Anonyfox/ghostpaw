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

| What it looks like     | What it actually is                                 |
| ---------------------- | --------------------------------------------------- |
| A todo item            | A quest with no temporal metadata                   |
| A deadline             | A quest with a `due_at` timestamp                   |
| A calendar event       | A quest with `starts_at` and `ends_at`              |
| A recurring commitment | A quest with a recurrence rule                      |
| A reminder             | A quest with a `remind_at` timestamp                |
| A completed action     | A quest in `done` state with a completion timestamp |
| A logged event         | A quest created retroactively in `done` state       |

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

| Field          | Purpose                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | What this quest is about. Human-readable, agent-writable.                                                                                                  |
| `description`  | Longer context. Markdown.                                                                                                                                  |
| `status`       | Current state — CHECK-constrained to seven valid values.                                                                                                   |
| `priority`     | Urgency level — CHECK-constrained to four valid values. Default `normal`.                                                                                  |
| `quest_log_id` | FK to `quest_logs`. Null = standalone quest.                                                                                                               |
| `tags`         | Comma-separated labels for filtering.                                                                                                                      |
| `created_at`   | When created. Set once on insert.                                                                                                                          |
| `created_by`   | Who created it: `"human"` or `"ghost"`. Default `"human"`.                                                                                                 |
| `updated_at`   | Last modification. Updated on every write.                                                                                                                 |
| `starts_at`    | When this begins. Populated for events.                                                                                                                    |
| `ends_at`      | When this ends. Populated for events with duration.                                                                                                        |
| `due_at`       | When this is due. Populated for deadlines.                                                                                                                 |
| `remind_at`    | When to surface this. Populated for reminders.                                                                                                             |
| `reminded_at`  | When the ghost last surfaced this reminder. Enables snooze: updating `remind_at` to a later time resets the cycle because `reminded_at < remind_at` again. |
| `completed_at` | When finished. Set automatically on terminal transition.                                                                                                   |
| `rrule`        | iCalendar RRULE string. Populated for recurring quests.                                                                                                    |

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

| State       | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `offered`   | On the Quest Board — proposed or quick-dumped, not yet accepted |
| `pending`   | Accepted, not yet started                                       |
| `active`    | In progress                                                     |
| `blocked`   | Waiting on something external                                   |
| `done`      | Completed successfully                                          |
| `failed`    | Attempted and failed                                            |
| `cancelled` | Abandoned intentionally                                         |

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

| Field           | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `quest_id`      | FK to the recurring base quest.                                   |
| `occurrence_at` | Which occurrence this tracks (the computed timestamp from RRULE). |
| `status`        | Whether this occurrence was completed or skipped.                 |
| `completed_at`  | When this occurrence was marked.                                  |

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

| Field          | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `title`        | Name of this project/direction.                            |
| `description`  | What this quest log is about. Markdown.                    |
| `status`       | Lifecycle state — CHECK-constrained to three valid values. |
| `created_at`   | When created. Set once.                                    |
| `created_by`   | Who created it: `"human"` or `"ghost"`.                    |
| `updated_at`   | Last modification. Updated on every write.                 |
| `completed_at` | When finished. Set on terminal transition.                 |
| `due_at`       | Optional deadline for the entire quest log.                |

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

This gives the haunt cycle material to work with. A ghost that knows a deadline is approaching thinks differently about what's worth investigating. A ghost that sees stale active quests might proactively ask the human about them. Temporal awareness feeds the same curiosity mechanisms described in features/CHAT.md — specific gaps in the ghost's knowledge of what's happening next.

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

| Quest State | RPG Equivalent                                              | Icon      |
| ----------- | ----------------------------------------------------------- | --------- |
| `offered`   | Quest on the bulletin board — `!` from NPC, `?` from player | `!` / `?` |
| `pending`   | Quest accepted, in the quest log                            | —         |
| `active`    | Quest in progress                                           | —         |
| `blocked`   | Quest waiting on prerequisite                               | —         |
| `done`      | Quest completed, rewards earned                             | —         |
| `failed`    | Quest failed, consequences applied                          | —         |
| `cancelled` | Quest abandoned or dismissed                                | —         |

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

---

## Planned Changes

### Vocabulary Alignment — RPG-Native Language Throughout

The quest system vocabulary currently mixes RPG and productivity/project-management language. All naming must be tightened to a coherent WoW-style RPG vocabulary, applied consistently across schema, types, tools, CLI, web UI, and docs:

- **`quest_logs` → `storylines`** — In every RPG, the Quest Log is the master journal (the UI). Using "quest log" for a grouping mechanism creates a naming collision. The web UI already calls the tab "storylines." The table, column (`quest_log_id` → `storyline_id`), types, tools (`questlog_create` → `storyline_create`, `questlog_list` → `storyline_list`), CLI subcommands, API routes, and components must all follow.
- **`cancelled` → `abandoned`** — No one "cancels" a quest. You abandon it. Every RPG uses this word.
- **`pending` → `accepted`** — You've taken the quest, it's in your journal, you haven't started yet. RPG-native.
- **`blocked` stays.** Essential for the execution loop — when the ghost hits something it can't resolve alone, the quest goes `blocked` with a reason and suggested unblocking options. "Stalled" (ghost thrashed without progress) is unified into `blocked` — the reason field distinguishes the cause, not the state. One state, many reasons. Temporal staleness detection complements this by catching quests that are `active` but silently stuck. If a storyline's current quest is blocked, the entire storyline is blocked. No RPG rename needed — "blocked" is universally understood and concise.
- **`priority: low/normal/high/urgent`** — Pure JIRA vocabulary. Evaluate themed alternatives or keep as internal mechanics but present differently in UI/docs.

### The Quest Board — Deeper Design

The Quest Board is currently described as "an unsorted inbox for ideas" (GTD language). It needs to be rethought as a first-class RPG concept, not a productivity inbox with a quest skin.

The `!` and `?` icons are borrowed from WoW but underutilized. In WoW, these markers carry precise meaning throughout the entire game, not just on a bulletin board:

- **`!` (yellow)** — a new quest is available. An NPC has something to offer.
- **`?` (yellow)** — a quest is ready to be turned in. Objectives complete.
- **`!` (grey/silver)** — a quest exists but you don't meet the requirements yet.
- **`?` (grey/silver)** — you have the quest but haven't finished the objectives.
- **`!` (blue/daily)** — a repeatable daily quest is available.

These markers should be used **throughout the entire quest system** as a visual language — not just as a tiny detail on the board. Every quest in every view (CLI, web UI, temporal context) could carry the appropriate marker state. This creates an instantly recognizable visual vocabulary that WoW players already know and non-gamers can learn in seconds.

The Quest Board itself needs more conceptual depth. It is not an inbox to be processed — it is the place where quests **exist before commitment**. The ghost proposing a quest (`!`) is an NPC offering work. The human dumping an idea (`?`) is an adventurer pinning a note. Accept means you're committing resources. Dismiss means you're passing. This framing changes the relationship between the user and the board — it's not a todo inbox creating processing anxiety, it's an opportunity space.

### Temporal Fusion as Core Thesis

The single-entity insight (task = event = deadline = reminder = recurring commitment, distinguished only by which optional fields are populated) is the strongest architectural claim of the quest system. Currently presented as a technical table, it should be the opening thesis of the feature document. In RPG terms: a quest is a quest. Whether it has a timer, triggers on a schedule, marks a specific date, or just sits in your journal — it's all the same thing. The system never forces "is this a calendar event or a todo?" because that distinction is artificial. This is research-backed and genuinely elegant.

### Quest Rewards — Sessions as XP and Raw Material

This is a fundamental insight that the current system doesn't articulate:

**Quests that require LLM work produce sessions. Sessions are the raw material for soul evolution and skill discovery.** Every quest the ghost works on generates chat sessions with tool calls, reasoning traces, successes, and failures. These sessions feed directly into the soul refinement pipeline — they ARE the experience points. This means:

- **All chats produce learning material** — casual conversations, delegations, haunts. But **quests are targeted expeditions** that produce focused, high-quality experience in a specific domain.
- **Not all quests produce equal XP.** A quest that requires deep multi-step code work produces far richer sessions than "remind me to buy milk." This maps naturally to RPG quest rewards — main story quests give more XP than fetch quests.
- **Quest scope is estimable in advance.** The ghost can broadly categorize quests by expected complexity/session depth — trivial (no LLM work, human does it), moderate (a few tool calls), substantial (multi-step delegation), epic (deep multi-session work). These categories are natural "quest difficulty" indicators that predict XP yield.
- **Quest completion is not fake gamification XP.** It is the actual evidence that drives trait acquisition in the soul system. A js-engineer soul that completed 50 code quests literally earned its traits from those sessions. The reward is genuine cognitive improvement — the ghost gets better at the type of work the quest required.

This reframes the entire quest system: quests aren't just tracking what needs doing — they are the **primary mechanism for directed growth**. The ghost doesn't just complete tasks. It goes on expeditions that make it stronger.

#### The Delegation Incentive — Making Ghost Execution the Rewarding Path

The system must make delegation the path of least resistance, not an advanced feature. The key insight: **human completion yields storyline progress but minimal ghost rewards. Ghost execution yields storyline progress PLUS XP, trait/skill drops, and soul evolution.**

When a quest is created or accepted, the ghost should naturally offer: "I can embark on this. Want me to handle it?" If the human says yes → scheduled background execution with full reward pipeline. If the human says no → quest stays in journal, human does it on their time.

When the human marks a quest done themselves, the warden processes the turn-in (always through warden, never direct DB write — cross-system effects like pack and memories are evaluated) but the XP yield is minimal. There are no rich sessions to mine. No drops. The task is done, the storyline advances, but the ghost didn't learn anything. The turn-in still matters — the warden captures what the human reports, stores relevant memories, updates pack bonds if applicable — but the reward screen is sparse.

**The visual nudge.** Before embarking, show the estimated XP yield and potential drops. After human completion, the ghost responds warmly but gently: "Done! Storyline advanced. Next time, want me to handle quests like this? I'd learn from the experience, and you'd get [estimated rewards] too." Not pushy. Not every time. But the incentive is visible: delegation = richer rewards = a stronger ghost = less manual work next time.

**The hamster wheel problem.** If the human keeps doing the same kind of quest manually, nothing changes — they're on a manual hamster wheel. If the ghost does it even once, it learns, potentially generates skill blueprints, and the next similar quest is easier/faster/cheaper. The system should make this dynamic visible over time: "You've manually completed 12 deploy quests. If I embarked on the next one, I could learn the pattern and handle future deploys autonomously." Not scolding. Observational. The data is already there in quest history.

**Simple quests don't spam drops.** Not every quest produces trait or skill drafts. A trivial quest ("buy milk") yields a few XP and nothing else. Only quests with substantial execution sessions — where the ghost actually had to figure things out, use tools, encounter problems — produce trait drafts or skill drafts. This is calibrated by the warden during the reward calculation: if the sessions are thin, the reward is just XP.

#### Human-Executed Quest Path

Not all quests are ghost-executable, and the human can always choose to do things themselves. The path still goes through the warden:

1. Human says "I finished quest #42" (via chat, CLI, or web UI button)
2. Warden processes the turn-in: asks what happened, captures the narrative
3. Warden stores relevant memories, updates pack bonds, evaluates storyline progress
4. XP yield is minimal — narrative-based, not session-metric-based
5. No drops (no rich execution sessions to mine)
6. Storyline advances normally

The human gets their task done. The storyline progresses. But the ghost doesn't get stronger from it, and the human will have to do similar tasks manually again. The incentive gradient is clear without being punitive.

#### Research Foundation for Delegation Design

**People forgo monetary rewards to retain control.** Individuals will make suboptimal decisions to preserve decision-making authority — they're aware it's suboptimal and do it anyway for psychological satisfaction. This is the "intrinsic value of control" and it's the fundamental resistance the delegation nudge must overcome. The ghost can't just offer better outcomes — it must make delegation feel safe, not like losing control. ([SSRN:2733142](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2733142))

**Status quo bias is the critical automation adoption barrier.** Process participants prefer current ways of operating over new automated systems and may actively resist. Notably, perceived fairness and trust don't significantly impact acceptance — _expectations_ do. This means the ghost should set expectations through demonstrated competence: successful quest completions shift expectations, which shift willingness to delegate. ([Springer, 2025](https://link.springer.com/article/10.1007/s12599-025-00962-2))

**Trust is the strongest predictor of delegation willingness.** Four factors predict human preferences for AI involvement: motivation, difficulty, risk, and trust — with trust most predictive. People strongly prefer machine-in-the-loop designs where humans maintain leading roles. The quest system respects this: the human accepts, triggers, unblocks, and turns in. The ghost executes but the human steers. ([AI Task Delegability](https://delegability.github.io/about.html))

**AI delegation increases human self-efficacy.** When humans know tasks are delegated to/by AI, their self-efficacy actually _increases_, improving performance and satisfaction. This means the ghost offering "I can handle this" may paradoxically make the human feel MORE capable, not less — if framed as empowerment ("I'll handle the routine so you can focus on what matters"), not abdication. ([ACM, 2025](https://dl.acm.org/doi/full/10.1145/3696423))

**Delegation willingness varies dramatically by task type.** People most readily delegate routine/companion tasks, least readily delegate high-stakes decisions. The ghost should be more assertive about offering to embark on routine quests and more deferential about complex judgment calls. Women consistently show lower delegation willingness — the ghost's behavior should adapt to the individual, not assume uniform receptivity. ([AI & Society, Springer, 2026](https://link.springer.com/article/10.1007/s00146-026-02858-5))

### Warden-Only Mutations — Stronger Case Than Pack/Memory

The quest system MUST move behind warden-exclusive mutations, and the case is actually stronger here than for pack or memory:

- **Quest descriptions carry critical context.** Currently, quest titles are hyper-specific and descriptions are often empty. But the creation context — what was being discussed, what the user's intent was, what constraints were mentioned — is rich information that gets lost when a bare `createQuest({ title: "fix the deploy bug" })` is all that's stored. The warden, operating within a conversation context, can capture a meaningful description that preserves the creation intent. Direct CRUD bypasses this entirely.
- **Normalization and deduplication.** The warden can check for existing similar quests before creating duplicates, assign to the right storyline, set appropriate temporal fields, and maintain consistency across the quest landscape.
- **State transition intelligence.** "Mark quest done" from a button click records completion. The warden marking it done can also trigger cross-system effects — updating related memories, noting the completion in pack bonds if it involved someone, assessing whether the storyline is now complete.
- **The Quest Board becomes a warden conversation.** Proposing a quest, accepting one, dismissing one — these are all natural language interactions that benefit from the warden's judgment and context.

### Storylines as Execution Plans — Cursor Plan Mode Analogy

Storylines are currently flat containers with a title, description, and status. They should evolve into something far more powerful: **structured execution plans with living progress tracking.**

The analogy is Cursor's plan mode crossed with Basecamp's scoped todo lists:

- **A storyline is a plan.** It has a rich markdown description explaining the approach, the constraints, the context, the "why." This is the longform thinking that precedes execution — not a one-liner title.
- **Quests within a storyline are the action items.** They can be created upfront (the plan) or emerge during execution (discovered work). They shrink, grow, and check off as the plan progresses.
- **The warden's quest tool calls are checkpoints.** When the ghost (via any soul delegation) creates, updates, or completes quests within a storyline, these are structural progress markers. The LLM stays on track because the quest state reflects reality — "3 of 7 steps done, next is X, Y is blocked because Z."
- **This makes storylines agent-usable execution scaffolding.** A complex multi-step task gets decomposed into a storyline with quests. The ghost works through them, checking off as it goes. The storyline description provides persistent context that survives across sessions and delegations. The quest list provides the exact same function as a "plan with todos" — but persistent, temporal-aware, and feeding into the soul evolution system.
- **Strict sequential execution within storylines.** Quests execute top to bottom — only the first non-terminal quest can be embarked on. If it's blocked, the storyline is blocked. No skipping ahead, no parallelization within a storyline. This enforces plan discipline: resolve the current step before moving on. Parallelism exists between storylines, not within them. The warden can reorder quests (revise the plan) but the execution is always sequential.
- **Hill Charts apply here.** The Basecamp insight about two-phase progress (figuring it out vs. executing) maps to storyline lifecycle: early quests are discovery/research (uphill), later quests are implementation (downhill). The ratio of accepted-to-active-to-done quests tells the hill position without storing it explicitly.

This positions storylines as the ghost's primary tool for managing complex work — not just a passive grouping mechanism but an active planning and execution framework.

### Quest Marker System — WoW-Native Visual Language

The `!` and `?` markers in WoW are not icons — they are a **system-wide visual language** that communicates quest state at a glance. Colors encode additional meaning. This language should be adopted throughout Ghostpaw's quest system (CLI output, web UI quest rows, temporal context, haunt seeds) as first-class state indicators, not a cosmetic detail on one view.

#### WoW Reference (canonical meanings)

| Marker | Color  | WoW Meaning                                                               |
| ------ | ------ | ------------------------------------------------------------------------- |
| `!`    | Yellow | New quest available — NPC has something to offer, ready to accept         |
| `!`    | Grey   | Quest exists but can't be accepted — prerequisites unmet, level too low   |
| `!`    | Blue   | Daily/weekly repeatable quest available — reset and ready for another run |
| `?`    | Yellow | Quest complete — objectives done, ready to turn in for rewards            |
| `?`    | Grey   | Quest accepted and in progress — objectives not yet complete              |

#### Ghostpaw Translation

| Marker     | Color                           | Ghostpaw Meaning                                                                                                                | When it appears |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `!` yellow | New quest proposed              | Ghost identified something worth tracking. Appears on the Quest Board as a ghost proposal. The ghost is the NPC offering work.  |
| `!` grey   | Quest exists but not actionable | Quest on board but has preconditions, or storyline context needed before it makes sense to start. Low-confidence proposal.      |
| `!` blue   | Recurring quest instance due    | A daily/weekly/scheduled quest has a new occurrence available. The RRULE triggered.                                             |
| `?` grey   | Quest in progress               | Quest accepted or active, work ongoing. The default state for quests in the journal.                                            |
| `?` yellow | Quest ready for turn-in         | Ghost believes the work is done and suggests completion. The warden flags quests for turn-in when evidence suggests resolution. |

#### Design Decisions (Resolved)

**The board is ghost-only, autonomous, FYI-style.** The ghost populates the board without asking permission. During session consolidation, haunt cycles, and howl processing, the warden identifies things worth tracking and creates offered quests — not as proposals requiring approval, but as FYI notifications that something was captured. "I noticed you have a deploy deadline Friday. Created a quest for it." The user can accept or dismiss later, on their own time. The warden ensures no duplicate quests are created on the board.

**The human creates quests through conversation, never through the board.** "Track this for me" → warden creates quest directly in `accepted` state with full context enrichment. "I should call the dentist" → warden captures it. The human has a direct line to the ghost — they don't need a bulletin board. The board is the ghost's autonomous surface.

**Acceptance is an enrichment step, not just a status change.** When the user accepts a board entry, the warden fleshes it out into an actionable plan — writing the quest's full "story text" with spelled-out context, approach, constraints, and relevant details. The initial offered quest has good captured context (title + description from the conversation where it was noticed), but acceptance is the moment where it becomes a concrete implementation intention. This is the Masicampo & Baumeister mechanism: the concrete plan that lets the brain release the open loop. The quest goes from "noticed thing" to "actionable commitment."

**Recurring quests are already accepted by definition — they cannot be board proposals.** A recurring quest was committed to when the recurrence was set up. New instances appear in the main quest view with their blue `!` marker (instance due). The user either does it, skips it, or abandons the recurrence. The board is purely for new proposals.

**Stale entries: important ones persist and may escalate to howl. The rest soft-delete into a "drawer."** Some offered quests are important enough to sit on the board indefinitely — the warden judges this based on temporal urgency and relevance. Things that become urgent may escalate to a howl ("I proposed tracking X three weeks ago — is this still worth it?"). Everything else gets soft-deleted during maintenance (status → `abandoned`, but retrievable). The drawer of old unaccepted quests is browsable — someone might go looking for old ideas when bored or wanting more XP.

**Chat is the primary quest interaction surface.** The coordinator can delegate to the warden at any time during normal conversation to: check what's on the board, see what quests can be turned in, trigger a turn-in right in chat and receive the results (XP earned, trait/skill drops) as text in the conversation. Web UI and CLI are read-only inspection surfaces (after warden-only mutations). The quest system is transparent — it works through the same conversation channel where quests are born.

**Every quest in every view carries its marker.** A quick scan of any quest list tells you everything: yellow `!` = ghost noticed something (board), grey `?` = in progress, yellow `?` = ready for turn-in. Gamers recognize this instantly. Non-gamers learn it in seconds because the visual logic is consistent.

**The `?` marker is freed for its proper WoW meaning: ready for turn-in.** The current design misuses `?` as "human quick-dump idea." In WoW, `?` always means completion. This correction makes the marker system internally consistent and externally recognizable.

**Marker state is computed, not stored.** The marker for any quest is derivable from its status, `created_by`, `rrule`, and completion readiness. No new columns needed — just a presentation function that maps quest state to the correct marker.

#### Open Questions

- Should the grey `!` exist at all, or is it over-engineering? Possible use: ghost captured something but context is low-confidence / uncertain.
- Color rendering in CLI — ANSI colors for yellow/grey/blue are straightforward. Web UI can use proper colored icons. Telegram messages need emoji or Unicode equivalents.
- Exact criteria for when stale board entries escalate to howl vs. get soft-deleted to the drawer.

### Quest Turn-In — The Reward Extraction Step

This is a fundamental design insight that changes the quest lifecycle:

**"Done" is not "turned in."** Completing the actual work is one step. Turning the quest in is a separate, explicit step where the warden extracts value from the experience. In WoW, you do the work (kill the boars), then you go back to the NPC (`?` yellow) and turn it in for rewards. The turn-in is when you get XP, item drops, reputation, and story progression.

In Ghostpaw, the turn-in is when the warden:

1. **Starts with what was planned.** The quest title, description, storyline context (if any), sibling quest states, and the original intent. This is the baseline — what was the ghost supposed to achieve?

2. **Pulls the full chronological chain of what actually happened.** All sessions where this quest was active, all tool calls, all reasoning traces, all delegation results. The quest needs session linkage columns (e.g. `quest_id` on sessions or a join table) to make this traceable. The warden reconstructs "the story of this quest" from creation to completion.

3. **Holistically judges plan vs. reality.** The richest insights emerge from the gap between intent and execution. With both the plan and the full trajectory in context, the warden evaluates: what was learned, what worked, what failed, what was harder than expected, what was surprising, what beliefs should be stored, what pack members were involved, what cross-system patterns emerged. If the quest belongs to a storyline, the warden also judges: was this step the bottleneck? Did discovery during this quest change the plan? Should later quests in the storyline be revised, added, or removed?

4. **Extracts direct memories.** Beliefs from the quest experience get stored through the normal warden memory tools — but informed by the full trajectory, not just the last session. "The user's deploy pipeline requires Docker credential rotation every 30 days" is a belief that only emerges from seeing the full quest arc.

5. **Calculates XP yield.** The warden can compute actual session metrics: how many sessions, how many tool calls, how many tokens, which souls were involved, how long it took. This is the literal "XP" — computable, honest, proportional to actual work. The number feeds into the soul evolution pipeline as weighted evidence.

6. **Drops trait drafts and skill drafts.** This is unique. During the holistic turn-in evaluation, the warden might identify:
   - A **trait draft** for a specific soul — "the js-engineer showed consistent use of TypeScript strict mode across all 7 quest sessions, suggesting a trait: 'Defaults to strict TypeScript.'" → written to `trait_drafts` via `traits.stash_draft()`.
   - A **skill draft** — "the quest required a repeated pattern of Docker-compose debugging steps that could be codified as a skill." → written to `skill_drafts` via `skills.stash_draft()`.
   - General domain knowledge → written directly as memories by the warden.
   - These are not direct mutations. Drafts are **sealed** until turn-in — invisible to mentor/trainer until the human reveals them. The mentor picks up trait drafts during its scouring cycle. The trainer picks up skill drafts during its creation cycle. Each domain soul decides independently whether to consume, merge, or pass. Attribution is always clear: every draft traces back to the quest that produced it.

7. **Handles failures too.** A quest in `failed` state can also be "turned in" — in RPGs, failed quests still give XP (less, but some). The warden's failure-mode turn-in runs SE-Agent-style revision: what was the approach, where did it fail, what's the root cause, what would work differently. This analysis becomes both a memory and negative-evidence for soul traits. Failed quests might produce the richest learning.

#### Lifecycle with Turn-In

```
offered → accepted → active → done → turned_in
                        ↕ blocked (with reason + suggestions)
                        ↘ failed → turned_in
                        ↘ abandoned
```

The `blocked` state is reversible — a quest goes blocked when execution hits something the ghost can't resolve alone. The warden records the reason and suggests unblocking options. If urgent, this triggers a howl. By default, blocked quests sit passively — the human can ask for all blocked quests with reasons and suggested options at any time. **Continuing a blocked quest is always an explicit action** — the human unblocks by deciding on the path forward, then explicitly triggers continuation.

The `done` state means "work is complete, awaiting turn-in." The `?` yellow marker appears on `done` quests — "ready for turn-in." The quest remains visible in all views until turned in. Only after turn-in does it visually disappear from active tracking (moves to history).

This gives users a **reason to want to turn quests in** — it's not just bookkeeping. There are vivid, tangible rewards: the XP number, the trait/skill drops, the memories extracted. The turn-in is the celebration moment, the chest-opening animation, the reward screen. Without it, the quest is done but the value isn't harvested.

#### Neuroscience of the Turn-In Moment

**Dopamine peaks at anticipation, not delivery.** Game designers exploit this by choreographing reveal sequences that create a "hope loop" sustaining engagement beyond rational decision-making. Physiological arousal measurements (EDA) confirm loot box interactions produce elevated stress responses during the opening moment, particularly for rare outcomes. The pre-calculated-but-not-yet-revealed rewards are the hope loop. The turn-in IS the reveal. ([netpsychology.org](https://netpsychology.org/loot-boxes-and-addiction-why-we-love-and-fear-randomness-in-games/); [arXiv:2507.04906](https://arxiv.org/abs/2507.04906))

**Variable ratio reinforcement is "remarkably resistant to extinction."** Unlike fixed reward schedules, unpredictable rewards keep people engaged. The quest system naturally produces variable rewards — some quests drop trait drafts, most don't. Some sessions produce skill drafts, most don't. This variability is the engagement mechanism. Making it predictable would weaken it. ([netpsychology.org](https://netpsychology.org/loot-boxes-and-addiction-why-we-love-and-fear-randomness-in-games/))

**Learning rates are proportional to the duration BETWEEN rewards, not reward frequency.** Overall learning over a fixed period remains independent of the number of reward experiences. This means spacing rewards (not every quest drops drafts) is neurobiologically correct — a Nature Neuroscience 2026 finding. Spamming drops on every quest would NOT increase engagement. It would habituate. Sparse, meaningful drops with consistent XP is the correct design. ([Nature Neuroscience, 2026](http://www.nature.com/articles/s41593-026-02206-2))

**Pity systems prevent frustration without destroying rarity.** Games increase odds or guarantee high-tier rewards after failed attempts, preventing endless frustration while preserving rarity's emotional impact. If a user turns in 10+ quests with only XP and no drops, the warden could weight the next turn-in toward a drop — not by manipulating the assessment, but by looking harder for patterns in the execution trajectory. Stability budgets that prevent extreme dry streaks boost session-to-session return rates better than pure randomness. ([PulseGeek, 2025](https://pulsegeek.com/articles/how-to-set-loot-table-probabilities-responsibly/))

#### Neuroscience of Failed Quest Turn-Ins

**Error recognition triggers anterior cingulate cortex activity, priming the brain for learning.** Failure activates cortisol (stress), dopamine (motivation), and serotonin (satisfaction) — neurochemical systems that directly affect neuroplasticity and learning rates. The brain evolved to learn rapidly from failure because mistakes directly affected survival. ([Educational Psychology Review, 2025](https://link.springer.com/article/10.1007/s10648-025-10013-7))

**Productive failure outperforms instruction-first on conceptual understanding.** Students who struggle first outperform those receiving instruction first on transfer tasks. The critical mechanism is activation of prior knowledge — the struggle IS the learning, not a cost of learning. Performance ≠ learning: smooth successful execution may undermine durable learning, while high error rates signal deep cognitive processing ("desirable difficulty"). ([Temple University, 2026](https://sites.temple.edu/edvice/2026/01/21/the-gift-of-error-reclaiming-failure-in-the-classroom/))

**Vicarious failure is equally effective when solution attempts show diversity.** Observing others' diverse failed approaches produces the same learning as experiencing failure directly. This means the ghost learning from its own failures AND from the human's reported failures are both valid paths — the diversity of the attempts matters more than who attempted. ([Springer, 2025](https://link.springer.com/article/10.1007/s11251-025-09706-x))

**Implication:** Failed quest turn-ins should NOT be treated as lesser. They are potentially the richest learning source. The turn-in prompt for failed quests should lean heavily into "what was tried, where did it fail, what was the recovery attempt, what diverse approaches were considered" — that's where the soul evolution signal is strongest. The warden should be instructed to extract more aggressively from failures, not less.

### Quest Execution — The Ghost Does the Work

Quests aren't passive tracking items — the ghost can actively execute them. This is where the quest system transcends todo lists and becomes an autonomous execution framework. The ghost picks up a quest, works on it in a background session, and delivers results. Multiple quests can execute concurrently as independent background processes.

#### The Execution Loop

The scheduler fires a **full ghostpaw instance** — not a specialist, but the coordinator with its complete delegation capabilities. The coordinator is instructed to work on a specific quest and to **check results with the warden after every meaningful step** until either genuine completion or a blocker is identified. This is step-by-step supervised execution, not a single-shot delegation.

```
1. Context assembly:  ghostpaw starts → coordinator → warden
                      "Brief me on quest #42"
                      Warden returns: quest description, storyline context,
                      sibling quest states, relevant memories, linked
                      prior sessions, pack info if applicable.
                      Coordinator now has a clear deliverable goal.

2. Step execution:    coordinator → specialist
                      "Do this next step: [specific sub-task from plan]"
                      Specialist executes using its tools, returns result.

3. Step validation:   coordinator → warden
                      "Quest #42 requires X. Step result: Y.
                       Are we on track? Is this step correct?
                       What should happen next?"
                      Warden evaluates against requirements.

4a. On track:         Warden confirms step, advises next action.
                      → back to step 2 with next sub-task

4b. Complete:         Warden judges the full deliverable is genuinely done.
                      Marks quest → done (yellow ? — awaiting turn-in)

4c. Blocked:          Warden identifies something the ghost cannot resolve
                      alone (needs human input, external dependency, access
                      it doesn't have, ambiguous requirements).
                      Marks quest → blocked with:
                        - clear reason explaining the blocker
                        - suggested unblocking options
                      If urgent → howl. Otherwise → sits passively.
                      Execution stops. Human unblocks explicitly.

4d. Failed:           Warden determines the approach isn't working after
                      repeated attempts. Marks quest → failed with
                      diagnostic analysis. Execution stops.
```

The warden checks happen **after every step**, not just at the end. This is critical — LLMs in extended loops drift toward premature conclusions and satisficing. Without a feedback partner, the specialist might declare "done" after touching one config file when the quest requires a full pipeline fix. The step-by-step warden validation catches drift early, keeps execution aligned with the original intent, and identifies blockers before wasting tokens on an impossible path.

The warden validates _alignment between intent and reported work_, not technical correctness. Technical accuracy is the specialist's job. This is the WoW quest NPC: it checks if you have the quest items, not how you fought. But because it checks after every step, it also functions as a progress tracker — it knows how far along the quest is, which matters for complexity estimation and XP calculation.

**Agent drift is a quantified production problem.** Recent research identifies progressive behavioral degradation in LLM agents over extended interactions — semantic drift (deviation from original intent), coordination drift (consensus breakdown), and behavioral drift (emergence of unintended strategies). Individual outputs appear reasonable while trajectories collectively degrade performance by double-digit percentages. The phenomenon is invisible to traditional monitoring. ([arXiv:2601.04170](https://arxiv.org/html/2601.04170v1)) State-of-the-art agents frequently "prematurely generate overly polished answers" and fail to incorporate iterative feedback, assuming static task targets despite goals being inherently underspecified. ([OpenReview, 2025](https://openreview.net/pdf/6aec466ee433ae854cb4c08747958b86d9741df5.pdf)) The step-by-step warden validation isn't optional — it's the primary mitigation for a well-documented problem. The Agent Stability Index (ASI) proposes measuring drift across 12 dimensions including response consistency, tool usage patterns, and reasoning stability — the warden's validation checks implicitly implement this.

**Task completion verification is a known gap.** AI coding agents routinely claim success without running tests, merge code without CI verification, or get stuck in planning loops. Microsoft's ReVeal framework explicitly optimizes self-verification through iterative generation-verification turns across 20+ turns with turn-level credit assignment. PreFlect introduces prospective reflection — criticizing plans _before_ execution using historical error patterns, enabling dynamic re-planning during execution rather than after failure. ([Microsoft Research, 2025](https://www.microsoft.com/en-us/research/publication/reveal-self-evolving-code-agents-via-reliable-self-verification/); [arXiv:2602.07187](https://arxiv.org/pdf/2602.07187)) The warden validation loop implements both — verification after every step (ReVeal pattern) and the ability to anticipate risks from the quest context (PreFlect pattern).

**Blocked quests.** When the warden identifies a genuine blocker, the quest transitions to `blocked` state. The reason and suggested options are stored with the quest. By default, blocked quests sit passively — no notification pressure. The human can ask "what's blocked?" at any time to get all blocked quests with reasons and suggested unblocking paths. **Continuing a blocked quest is always an explicit action** — the human decides the path forward, then explicitly triggers continuation (via chat or UI). This respects the human's time and judgment while preserving all context for when they're ready.

Research on AI-human handoffs confirms: explicit context serialization achieves 94% handoff success vs 66% with implicit context sharing. Warm transfers (full context preserved) reduce handling time by 36.5%. The "amnesia problem" — where escalations strip context, forcing repeat explanations — drives 63% abandonment. ([Athenic, 2025](https://getathenic.com/blog/agent-handoff-patterns-case-study); [Zylos, 2026](https://zylos.ai/research/2026-01-30-ai-agent-human-handoff)) Blocked quest records MUST be rich — full context of what was tried, where it failed, what options the warden sees. When the human unblocks, the ghost should have immediate full context. And blocked quests sitting too long (configurable timeout, days to weeks) should escalate or auto-suggest abandonment — the three options pattern (unblock with option A / abandon / revise the approach) maps cleanly.

**Hard limits.** If the warden keeps rejecting steps without progress (specialist thrashing), execution stops after 3 consecutive rejections on the same sub-task. The quest transitions to `blocked` with diagnostic feedback — the reason explains that the ghost attempted the work but couldn't make progress, plus what was tried and what went wrong. The user is informed. There is no separate "stalled" state — stalling IS a form of being blocked (blocked by the ghost's own limitations). One state, many reasons. The user can review the diagnostic, decide a path forward, and explicitly trigger continuation.

#### Triggering Execution

Quest execution is **always a scheduled background process**, never blocking. Even "do it now" creates a one-off schedule with `next_run_at: now` and returns immediately. The user never waits for quest execution in the foreground. The ghost embarks, works in the background, and results appear when done.

**Immediate execution.** User says "work on quest #42" in chat → warden creates a one-off schedule with `next_run_at: now`. The scheduler picks it up within seconds. The chat confirms "embarking on quest #42" and continues — the user isn't blocked.

**Deferred execution.** User says "start quest #42 tomorrow at 9am" → warden delegates to chamberlain:

```
chamberlain → schedule_create({
  command: "ghostpaw quest embark 42",
  next_run_at: <tomorrow 9am>,
  rrule: null    // one-off, fires once, auto-disables after
})
```

Both paths are identical in implementation — always a one-off schedule entry. The only difference is `next_run_at`. After execution, the schedule is done. Recurring quests have their own recurrence via RRULE on the quest itself — they don't use scheduled execution triggers.

**`ghostpaw quest embark <id>`** — the execution primitive. A dedicated CLI subcommand. The ghost embarks on a quest — it receives only the quest ID, everything else is prepared transparently:

1. Opens database, fetches quest by ID with full storyline context
2. Creates a session with `purpose: "quest"` and `quest_id` linkage
3. Asks the warden to prepare the full execution briefing (quest description, storyline context, sibling states, relevant memories, pack info)
4. Runs the coordinator with the warden-prepared briefing as instruction
5. Coordinator executes the step-by-step loop (specialist work → warden validation → next step)
6. **On genuine completion: reward calculation runs as the mandatory final step** — the warden computes XP yield, identifies potential trait/skill drafts, assesses the execution trajectory. Drafts are **written as sealed** to their respective modules (`traits.stash_draft()`, `skills.stash_draft()`). The quest transitions to `done`. The user sees "Quest #42 complete! Rewards ready for turn-in." when they next interact.
7. On blocker identified: quest → `blocked` with reason + suggestions, session closes
8. On repeated failure: quest → `blocked` with diagnostic analysis (stalling is a form of being blocked), session closes

**The reward pre-calculation matters.** It takes a few extra seconds during the embark process, but it means the turn-in is instant — no additional LLM call needed just to compute rewards. The user clicks "turn in," sees their XP and drops immediately. The turn-in action unseals the drafts (`traits.reveal(quest_id)`, `skills.reveal(quest_id)`) and commits memories. The surprise moment is the discovery of what dropped, not waiting for a computation.

**Cost estimation before embark.** Before committing, the warden provides a rough cost estimate: "This quest looks like ~$2–4 of work. Fits within today's remaining budget." The estimate uses the XP prediction formula in reverse — estimated complexity maps to estimated token usage maps to estimated cost. This estimate can be stored on the quest record and updated when the quest description changes. Cost transparency prevents surprise bills from aggressive autonomous execution.

**Proactive execution.** Handled by `ghostpaw quests prowl` — a dedicated built-in heartbeat subcommand that runs every minute. Pure code, zero tokens. Checks concurrency slots (weight-aware), budget headroom, deadline urgency, and storyline ordering via SQL, then spawns `ghostpaw quests embark <id>` processes for the highest-priority candidates. See **Future Design § Quest Execution** for the full prowl specification.

#### Storyline Ordering and Concurrency

**Within a storyline: strict sequential execution.** Only the first non-terminal quest (by position, top to bottom) can be embarked on. The warden enforces this — no skipping ahead, no parallelization within a storyline, not even via direct CLI or web UI. If the current quest is blocked, the entire storyline is blocked. Full stop. No tolerance for pseudo-successes or working around a stuck step.

This enforces discipline: the storyline is a plan, and plans execute in order. If step 3 is blocked, you don't jump to step 5 — you resolve the block first or revise the plan (the warden can add/remove/reorder quests in the storyline). The ordering is always the `position` field, and the warden reasons about it top to bottom.

**Between storylines: full parallelism.** Different storylines are independent campaigns. The ghost can embark on quests from multiple storylines simultaneously. Each is a separate child process spawned by the scheduler with its own session, context, and specialist delegation. The scheduler tracks concurrent child processes in a `Map<id, ChildProcess>`.

```
Storyline A: [quest 1 ✓] [quest 2 → active] [quest 3 pending]
Storyline B: [quest 1 → active]                                   ← both can run
Storyline C: [quest 1 → blocked] [quest 2 pending]               ← storyline blocked
Standalone:  [quest X → active]                                   ← independent
```

Standalone quests (no storyline) are independently parallelizable — they have no ordering constraints.

#### Executability

Not all quests are ghost-executable. "Call the dentist" isn't something the ghost can do. "Refactor auth module" is. The quest description and the ghost's tool capabilities determine executability.

The warden should assess executability at quest creation or acceptance time: can the ghost meaningfully work on this with its available tools? This becomes a property of the quest — not a hard schema field, but a warden judgment stored in the quest description or metadata. Non-executable quests are commitment-tracking items: the human does the work, the ghost tracks the commitment, sends reminders, and the turn-in still extracts value from the experience.

#### Research Alignment

The execution loop maps directly to several findings:

- **PROGRA + CORAL**: Quest tool calls are structural progress checkpoints. The warden validation is explicit progress assessment. Context isolation per quest session prevents token bloat.
- **AgentDebug**: The validation loop catches cascading failures early. The 3-attempt limit with diagnostic feedback prevents infinite loops while preserving failure information for turn-in learning.
- **TDP**: Each quest runs in isolated context scoped to its storyline position. Errors in one quest don't propagate to parallel quests. Token reduction from context isolation applies here.
- **ReCAP**: Storylines-as-plans with quest decomposition maps to ReCAP's plan-ahead + execute-first-refine-remainder pattern. The warden can revise remaining quests based on execution results.
- **BAM + BRIDGE**: Quest complexity estimation feeds scheduling decisions — simple quests can batch, complex quests get dedicated time slots. The scheduler can allocate resources proportionally.
- **ProAct-Helper**: Storylines with quest structure enable proactive temporal behavior. The strict sequential ordering within storylines simplifies dependency reasoning — the next quest is always the first non-terminal one. Parallelism exists between storylines, not within them.

#### Distributed Drops — Direct Stashing Into Domain Modules

The narrow "suggestions table" concept was explored as a centralized Inventory subsystem, then dissolved. The routing is always 1:1 — trait observations go to the mentor, skill patterns go to the trainer, domain knowledge goes to memory. There is no N×N exchange problem. A generic inventory adds a layer (stash → unclaim → claim → consume) where a direct write suffices.

Instead, each domain module exposes a controlled stashing API:

- **`traits.stash_draft()`** — writes a `trait_draft` to the traits module's `trait_drafts` table. The mentor picks these up during scouring cycles. Trait observations like "the js-engineer showed consistent use of TypeScript strict mode across all 7 quest sessions" are stashed here.
- **`skills.stash_draft()`** — writes a `skill_draft` to the skills module's `skill_drafts` table. The trainer picks these up during creation cycles. Procedural patterns like "Docker-compose debugging sequence that could be codified" are stashed here.
- **General domain insights** → the warden writes these directly as memories. No intermediate staging needed — the warden already manages memory.

**The sealed mechanic.** Drafts written during embark Phase 2 are `sealed = true` — invisible to mentor/trainer until the quest is turned in. Turn-in calls `traits.reveal(quest_id)` and `skills.reveal(quest_id)`, which flip the sealed flag. Failed/abandoned quests → sealed drafts get cleaned up. The loot bag surprise is preserved: the user sees what dropped at turn-in time, not before.

**The loot bag view.** Cross-module read query: "show all trait_drafts and skill_drafts WHERE quest_id = X." Each module exposes a query function for this. The UI displays the full reward screen from both tables, attributed to the quest.

**Why distributed instead of centralized:**

1. **No subsystem to maintain** — one less module, one less table, one less lifecycle.
2. **Domain-native crafting** — the mentor understands trait semantics, the trainer understands skill structure. Each soul's fusion/merging is domain-aware by default. A generic system can't make these calls.
3. **Clean boundaries** — each module owns its own data fully. The warden writes via each module's API at evaluation time. No shared tables.
4. **Souls gain richness** — mentor and trainer each gain a third interaction mode (scouring drafts) and crafting capability, balancing their relatively lighter tool load compared to warden/chamberlain.
5. **Attribution still works** — every draft has `quest_id` for origin tracking. Crafted/merged items trace lineage through `merged_into_id`.

### The Three Abstraction Levels

The quest system has exactly three levels. No more, no less. Each level has a distinct purpose, stability profile, and lifecycle.

```
Storyline (why — the overarching campaign)
  └── Quest (what — a scoped deliverable)
        └── Subgoal (how — dynamic execution checkpoint)
```

**Storylines are stable.** They represent long-term campaigns, projects, themes: "Migrate to Kubernetes," "Launch v2," "Learn Rust." Created deliberately, rarely changed. The description is strategic context — the "why" that gives every quest within it meaning. A storyline is complete when its quests have achieved the overarching goal. In WoW: a quest chain.

**Quests are semi-stable.** Individual deliverables within a storyline: "Set up k8s cluster," "Write migration scripts." Each has a title, rich description (the plan), temporal metadata, and a status lifecycle. Quests can be added to or removed from storylines as the plan evolves — the storyline is a living execution plan, not a fixed list. A standalone quest without a storyline is fine — not everything needs a campaign. In WoW: an individual quest.

**Subgoals are volatile.** Dynamic checkpoints within a single quest — the individual objectives. "Configure ingress controller," "Set up cert-manager," "Test with staging domain." They grow, shrink, reorder, and check off as the quest progresses. A quest with zero subgoals is binary — done or not done, like a simple "deliver this letter" quest. A quest with five subgoals is only complete when all five are checked off — like "kill 10 boars AND fetch 20 water buckets." In WoW: quest objectives. In Cursor: plan mode todo items.

#### Subgoal Schema

```sql
quest_subgoals (
  id          INTEGER PRIMARY KEY,
  quest_id    INTEGER NOT NULL REFERENCES quests(id),
  text        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  done_at     INTEGER
)
```

Intentionally minimal. Text + done + position + timestamps. No priority, no description, no category, no assignee. The warden manages these during quest execution — adding subgoals as the plan becomes clearer, checking them off as steps complete, reordering as priorities shift, removing ones that turn out irrelevant.

#### Subgoals as the Self-Organization Mechanism

This is the mechanism that keeps the LLM on track during nontrivial `quest embark` sessions. Every warden validation step sees the current subgoal state:

```
Quest: Fix Deploy Pipeline
Subgoals:
  [x] Diagnose credential rotation failure    (done 14:22)
  [x] Update promote.sh with refresh logic    (done 14:38)
  [ ] Test staging → prod promotion
  [ ] Update runbook with new rotation steps
  [ ] Verify monitoring alerts fire correctly
```

The coordinator knows exactly where it is — 2 of 5 done, next up: test staging promotion. The warden validates each step against the specific subgoal it's supposed to address. No ambiguity about what "progress" means. No drift, because the checklist is explicit and the warden enforces it.

**Dynamic evolution.** Subgoals aren't fixed at quest creation. During execution, the warden can:

- **Add** new subgoals when a step reveals additional work ("we also need to update the monitoring config")
- **Remove** subgoals that turn out unnecessary ("the runbook already covers this")
- **Reorder** when priorities shift ("test first, then update docs")
- **Split** a subgoal that's too broad into smaller ones

This is exactly Cursor's plan mode behavior: a living checklist that evolves as understanding deepens, managed by the LLM itself, with each checkbox representing a concrete deliverable that can be validated.

**Completion logic.** A quest with subgoals is complete when ALL subgoals are checked off AND the warden's holistic judgment confirms the deliverable is genuinely done. The subgoals are necessary but not sufficient — the warden might add a final subgoal if the checked-off items don't actually solve the quest's stated goal. A quest with zero subgoals relies entirely on the warden's judgment against the quest description.

#### Session Linkage for Quest Trajectories

For the turn-in to work, the warden needs to reconstruct which sessions belong to a quest. Options:

- **`quest_id` column on sessions table** — simple, direct. When the ghost is working on a quest during a delegation or chat, the session records which quest it's serving. Nullable — most sessions aren't quest-related.
- **`storyline_id` column on sessions table** — broader linkage. Sessions serving any quest in a storyline get tagged. Useful for storyline-level turn-in too.
- **Join table `quest_sessions`** — many-to-many. A session can serve multiple quests (working on two quests in one conversation). A quest has multiple sessions. Most flexible but adds complexity.

The simplest option (`quest_id` on sessions) covers 90% of cases. The join table is only needed if multi-quest sessions are common — which they probably aren't since delegation typically focuses on one task.

**Critical boundary: quest sessions are excluded from regular distillation.** The `quest_id` column doubles as an ownership flag. Sessions tagged with a quest are processed by the embark Phase 2 evaluation — holistically, with full quest trajectory and storyline context. Regular distillation (the warden's scheduled session processing) must skip `quest_id IS NOT NULL` sessions to prevent double-harvesting the same material with worse context. Exception: sessions linked to `abandoned` quests are released back to regular distillation since Phase 2 never ran. See schema extensions (section 20) for the exact query.

### Research Foundation for Planned Changes

#### Progress Awareness and Checkpointing

- [PROGRA: Progress-Aware RL for Multi-Turn Function Calling](https://arxiv.org/abs/2509.23206) (ICLR 2026) — Explicit progress summarization + future task planning reduces contextual redundancy and improves alignment between local actions and global task completion. Validates quest tool calls as structural progress checkpoints within storylines.
- [CORAL: Cognitive Resource Self-Allocation](https://openreview.net/forum?id=NBGlItueYE) (2025) — Agents maintain checkpoints in working memory, adaptively purge cluttered context to resume from recent checkpoints. Significantly outperforms standard methods on long-horizon benchmarks. Validates quests as persistent progress markers that survive across sessions.

#### Learning from Execution Trajectories (Sessions as XP)

- [SE-Agent: Self-Evolution Trajectory Optimization](https://arxiv.org/abs/2508.02085) (NeurIPS 2025) — Treats interaction trajectories as rich learning sources. Three operations: revision (learn from failures), recombination (cross-trajectory inspiration), refinement (enhance performance). 80% on SWE-bench, 55% relative improvement across five LLMs. Validates quest sessions feeding soul evolution. Revision operation maps directly to failed-quest turn-in learning.
- [MUSE: Experience-Driven Self-Evolving Agent](https://arxiv.org/abs/2510.08002) (2025) — Plan-Execute-Reflect-Memorize loop. After each sub-task, agent reflects on trajectory and converts it into structured reusable memory. **Memory from only ~10% of tasks generalizes zero-shot to new tasks.** 51.78% on TAC productivity benchmark. Validates that not every quest needs to produce learning — a small set of rich quest sessions creates transferable experience.
- [LEGOMem: Modular Procedural Memory](https://arxiv.org/abs/2510.04851) (Microsoft, AAMAS 2026) — Decomposes past task trajectories into reusable memory units placed strategically across orchestrators and task agents. Even smaller models benefit substantially. Maps to quest sessions → warden distillation (memory), mentor evaluation (traits), trainer extraction (skills).

#### Plan Decomposition and Storylines

- [ReCAP: Recursive Context-Aware Planning](https://arxiv.org/abs/2510.23822) (Stanford, NeurIPS 2025) — Plan-ahead decomposition generates full subtask list, executes first, refines remainder. Structured re-injection of parent plans maintains context. Memory-efficient — costs scale linearly. **GPT-4o from 38%→70% success.** Validates storylines-as-plans with quest decomposition.
- [TDP: Task-Decoupled Planning](https://arxiv.org/abs/2601.07577) (Jan 2026) — Decomposes tasks into DAGs of sub-goals with scoped contexts per sub-task. Confines reasoning and replanning to individual sub-tasks, preventing error propagation. **Token reduction up to 82%.** Validates storyline→quests decomposition with isolated quest contexts.
- [MagicAgent: Generalized Agent Planning](https://arxiv.org/abs/2602.19000) (Feb 2026) — Foundation model for hierarchical task decomposition, tool-augmented planning, multi-constraint scheduling, long-horizon execution. 75.1% on WorkBench, 86.9% on BFCL-v3.

#### Effort Estimation and Complexity Scoring

- [Plan-and-Budget / BAM](https://arxiv.org/abs/2505.16122) (ICLR 2026) — Bayesian Budget Allocation Model. Decomposes queries into sub-questions, allocates budgets based on estimated complexity. **Up to 70% accuracy gains, 39% token reduction.** Early steps deserve more compute (highest uncertainty). Validates quest complexity estimation for XP prediction.
- [BRIDGE: Predicting Task Completion Time](https://arxiv.org/abs/2602.07267) (Feb 2026) — Latent task difficulty varies **linearly with logarithm of human completion time.** Quest difficulty IS estimable — predictably, not randomly.
- [ACONIC: Constraint-Induced Complexity](https://arxiv.org/abs/2510.07772) (2025) — Formal complexity measures for task decomposition. Models tasks as constraint problems to guide decomposition quality.

#### Failure Detection and Recovery

- [AgentDebug: Systematic Failure Detection](https://arxiv.org/abs/2509.25370) (2025) — Error taxonomy across memory, reflection, planning, action, system-level. Cascading failure analysis traces root causes. **24% higher all-correct accuracy, 26% task success improvement** through targeted recovery. Failed quests should extract diagnostic information for learning.

#### Proactive Temporal Behavior

- [ProAct: Agentic Lookahead](https://arxiv.org/abs/2602.05327) (Feb 2026) — Grounded lookahead distillation enables agents to internalize foresight reasoning without expensive inference-time search. Validates quest-driven proactive behavior.
- [ProAct-Helper: Structure-Aware Proactive Response](https://arxiv.org/abs/2602.03430) (Feb 2026) — Task graphs encoding step dependencies and parallel execution. **6.21% trigger detection improvement, 15.58% parallel action increase.** Storylines with quest dependencies enable parallel execution detection.
- [BAO: Behavioral Agentic Optimization](https://arxiv.org/abs/2602.11351) (Feb 2026) — Balances task performance with user engagement through behavior enhancement and regularization for proactive agents.

#### Gamification Effectiveness

- [MainQuest 2026 Effectiveness Data](https://www.mainquest.net/gamified-habit-trackers-effectiveness-research-2026) — Task completion rates improve **40-60%** with deep gamification vs traditional lists. Shallow pointsification loses effectiveness after 2 weeks. Deep gamification with story progression and character growth drives retention for **years**. Particularly powerful for neurodivergent users (external dopamine loop compensates for executive function deficits).
- [Self-Determination Theory in Gamification](https://www.mdpi.com/1660-4601/23/3/328) (2025) — Three needs: autonomy (quest selection), competence (level progress), relatedness (social bonds). Systems satisfying all three drive sustainable intrinsic motivation.
- [Progression System Taxonomy](https://www.intechopen.com/online-first/1221745) (IntechOpen, 2025) — Six types: skill-based, XP-based, item-based, narrative, social, hybrid. Ghostpaw uniquely combines XP-based (soul evolution), narrative (storylines), and skill-based (actual capability improvement) — identified as the strongest retention pattern.

#### Temporal Reasoning

- [SPAN: Cross-Calendar Temporal Reasoning](https://arxiv.org/abs/2511.09993) (2025) — State-of-art models achieve only **34.5% accuracy** on temporal reasoning. Tool-augmented approaches reach **95.31%.** Validates the `datetime` tool on the warden — LLMs need computation tools for temporal math.
- [TKG-Thinker: Temporal Knowledge Graph Reasoning](https://arxiv.org/abs/2602.05818) (Feb 2026) — Agentic RL for reasoning over temporal knowledge graphs with adaptive retrieval and multi-dimensional rewards.

### Exploitation Opportunities Summary

The following value can be extracted from the existing quest architecture with minimal new mechanisms:

1. **Progress-aware storyline execution (PROGRA + CORAL).** Quest tool responses include brief progress summaries. The executing soul gets explicit progress awareness. Cost: ~20 tokens per quest tool response, zero new tools.

2. **Trajectory-to-evolution pipeline (SE-Agent + MUSE + LEGOMem).** Quest turn-in explicitly extracts procedural patterns, not just beliefs. The warden's turn-in prompt knows to look for what approach worked, what sequence was effective, what tools were used. MUSE shows ~10% of tasks provide generalizable learning — the turn-in identifies which quests are in that 10%.

3. **Context isolation via storyline scoping (TDP + ReCAP).** Delegation context assembled from storyline description + current quest + quest list with states. Not full conversation replay. Token reduction up to 82%.

4. **Quest difficulty estimation (BAM + BRIDGE).** Warden estimates complexity at creation time. Feeds temporal planning, XP prediction, storyline progress assessment. BRIDGE shows difficulty is reliably predictable from description analysis.

5. **Failure trajectory learning (AgentDebug + SE-Agent).** Failed quest turn-ins run revision analysis: approach, failure point, root cause, alternative strategy. Produces rich memories and negative-evidence for soul traits. Failed quests potentially produce the richest learning.

6. **Pattern learning from completion history (ProAct + temporal mining).** Over time, quest data reveals: average completion time by tier, which types the user cares about, which recurring quests get skipped, what time of day quests complete, which storylines stall. Pure SQL analytics on existing data, fed into haunt seeds and howl timing.

7. **Deep gamification satisfaction (SDT + MainQuest).** The quest system already satisfies all three SDT needs: autonomy (quest selection), competence (soul level-ups), relatedness (pack bonds). The 40-60% completion improvement is available because the gamification is structurally real. The turn-in mechanic makes the reward loop **visible and immediate** — the celebration moment where XP, trait drops, and skill drops are revealed.

8. **Turn-in as condensed extraction (SE-Agent + MUSE + AgentDebug).** The quest turn-in action condenses multiple paper findings into a single step: trajectory review (MUSE reflection), experience extraction (LEGOMem decomposition), failure analysis (AgentDebug taxonomy), evolution input (SE-Agent's revision/recombination/refinement), and direct drops into domain modules (trait drafts → traits, skill drafts → skills). One warden action, comprehensive value extraction.

### XP Formula — Quantifying Learning Value

XP must be a concrete, computable number that people can develop intuition for. "340 XP" should convey "substantial piece of work." "12 XP" should feel like a trivial task. The number must be honest — derived from actual session data, not arbitrary points. And it must be computable both **after execution** (precise, from real data) and **before execution** (estimated, from quest description analysis) using the same formula with different inputs.

#### Requirements

1. **Grounded in session data.** The raw inputs exist: token count (input + output), tool call count, session count, unique souls involved, duration, subgoal count, error/retry count. These are objective, measurable, already stored.

2. **Dual-mode.** Post-execution: precise calculation from actual session metrics. Pre-execution: ballpark estimate from quest description, estimated complexity tier, and historical averages for similar quest types. Same formula, different input precision.

3. **Implementable as a pure function.** `calculateXP({ tokens, toolCalls, sessions, souls, duration, subgoals, errors })` — simple arguments, no LLM call needed. The warden runs this after the final step of embark; the pre-execution estimate uses the same function with projected values.

4. **Human-intuitive scale.** The number should feel meaningful. Research direction: logarithmic scaling (BRIDGE shows difficulty is linear with log of completion time). A quest that takes 10x more tokens shouldn't give 10x more XP — diminishing returns feel natural and prevent XP inflation from verbose sessions.

5. **Differentiates ghost vs. human execution.** Ghost-executed quests produce rich session data → full XP. Human-executed quests produce only narrative turn-in → minimal XP (maybe 10–20% of estimated ghost XP). The differential is visible before execution: "If you do it: ~15 XP. If I embark: ~120 XP + potential drops."

6. **Feeds cost estimation.** The same complexity dimensions that predict XP also predict token usage. Inverting the formula: estimated XP → estimated tokens → estimated cost at current model pricing. "This quest looks like ~150 XP, roughly $2–4." Stored on the quest record, updated when the description changes.

#### Dimensions to Explore

- **Token volume** — raw material. More tokens = more conversation = more learning surface. But logarithmic — a 100k token session isn't 10x more valuable than a 10k session.
- **Tool call diversity** — sessions with many different tool types (filesystem + web + bash + delegation) are richer than sessions with repetitive tool calls. Diversity signals learning across capabilities.
- **Error density** — sessions with errors that were recovered from are more valuable than clean runs. The recovery pattern IS the learning. AgentDebug validates this — failure trajectories produce the richest diagnostics.
- **Subgoal count** — more subgoals = more structured work = more checkpoints = richer progress data.
- **Novelty** — quests in domains the ghost hasn't worked in before are worth more than repeat patterns. First-time deploy quest > 50th deploy quest. Diminishing returns per quest archetype.
- **Session count** — multi-session quests (requiring context resumption) are harder than single-session quests.

#### Scientific Foundation for the Formula

**The Weber-Fechner Law dictates logarithmic scaling.** One of psychology's oldest and most replicated laws: perceived intensity scales with the logarithm of physical stimulus. Equal steps in perceived effort require equal _multiplicative_, not additive, changes. A quest producing 10x more tokens should NOT give 10x more XP — the human brain perceives effort on a log scale. A 100 XP quest should "feel" twice as substantial as a ~30 XP quest, not a 50 XP quest. This is psychophysics, not game design intuition — it's why every successful RPG uses exponential XP curves. ([PsychologyFor, 2026](https://psychologyfor.com/the-weber-fechner-law-what-it-is-and-what-it-explains/))

**Token complexity is an intrinsic task property.** Each task has a minimal number of tokens required for successful completion, creating a universal tradeoff between reasoning length and accuracy with sharp threshold behavior at the question level. This validates pre-execution XP estimation: task descriptions contain enough signal to predict token complexity before generation. The `calculateXP()` function has theoretical legs — the complexity is IN the description, not just in the execution. ([arXiv:2503.01141](https://arxiv.org/abs/2503.01141))

**Computational effort is measurable from model internals.** Multiple Token Divergence (MTD) measures effort as KL divergence between full model output and a shallow prediction head, correlating positively with problem difficulty on mathematical benchmarks. No additional training required. This means difficulty IS computable, not just estimable. ([arXiv:2512.22944](https://arxiv.org/abs/2512.22944))

**Adaptive budget allocation via difficulty prediction.** Lightweight classifiers on transformer hidden states can predict optimal reasoning length before generation, yielding 7.9% accuracy improvement at identical token cost. Validates the "same formula, different precision" dual-mode approach — pre-execution estimates use projected values from the same function that post-execution uses actual values. ([arXiv:2602.01237](https://arxiv.org/abs/2602.01237))

**Game design consensus on progression curves.** Balanced progression uses a modified logarithmic function: early advancement quick, effort increases exponentially approaching upper limits. Standard formulas: polynomial `Level² × base` or exponential `base × multiplier^(level-1)`. The reference calibration ("100 XP = a solid hour of focused ghost work") is standard practice in game design. ([Wild Flint Books, 2025](https://wildflintbooks.com/blog/crafting-balanced-progression); [DesignTheGame](https://www.designthegame.com/learning/courses/course/fundamentals-level-curve-design/example-level-curve-formulas-game-progression))

**Perceived advancement value is proportional to required effort but inversely proportional to time since previous advancement.** Five psychological elements for satisfying progression: occasional unexpected rewards, multiple advancement paths, meaningful long-term aspirations, achievable short-term goals, and clear metrics. All five are structurally present in the quest system. ([Nature Scientific Reports, 2025](https://www.nature.com/articles/s41598-025-14628-2))

#### Research Needed

A concrete formula requires empirical validation. Placeholder approach: weighted log-sum of dimensions, calibrated against a reference scale (e.g., 100 XP = "a solid hour of focused work for the ghost"). Weber-Fechner dictates the log-sum is the correct functional form, not a design choice. The formula should be a config-adjustable function so it can be tuned as patterns emerge from real usage data. Initial weights are educated guesses; the system learns better weights from the correlation between XP and actual soul evolution impact over time.

### Recurring Quests — Engagement Patterns

Dailies and weeklies are the most reliable engagement mechanism in every game, and the most reliable data source for temporal pattern learning. The RRULE + quest_occurrences schema handles the mechanics, but the behavioral layer needs development:

- **Streak tracking.** The ghost should notice completion and skip patterns. "Morning standup notes: 12-day streak" or "you've skipped 4 of the last 5 weekly reviews." This is pure SQL on quest_occurrences data.
- **Adaptive scheduling.** If a daily quest is consistently completed at 9am, the ghost learns this and adjusts reminder timing. If it's consistently skipped on weekends, suggest modifying the RRULE. The chamberlain handles the schedule adjustment; the pattern recognition feeds from quest data into memory.
- **Decay detection.** A recurring quest that was reliably completed for weeks and then starts getting skipped is a signal worth surfacing. Habit decay is gradual — the ghost can catch it before the user notices. Not a howl (not urgent) but a gentle mention during the next conversation.
- **No quest template system.** Users of ghostpaw are everyone — not just engineers. Quests must stay flexible and trust the souls involved to figure things out. Retrospective pattern detection after enough runs could identify custom structures that worked and failure patterns to avoid, but this requires more research before committing to a mechanism.

#### Streak Science

**Loss aversion is the primary streak mechanism.** The pain of losing accumulated streak progress is ~2x stronger than the pleasure of gaining one more day. Streaks create a "second-level objective" — keeping the streak alive becomes as important as the original goal, reducing mental negotiation about whether to perform the task. ([Smashing Magazine, 2026](https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/); [Marketing Monsters](https://marketingmonsters.io/blog/the-science-behind-streak-based-motivation))

**Streak visibility drives commitment.** Duolingo's iOS widgets displaying streaks increased commitment by 60%. Users reaching a 7-day streak are 3.6x more likely to complete their course. Users with 7+ day streaks are 2.4x more likely to return the next day. Visibility IS the mechanism — showing the streak makes it real. ([UX Magazine, 2025](https://uxmag.medium.com/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame-3dde153f239c))

**Streak freeze INCREASES persistence.** Counterintuitively, allowing occasional misses (like Duolingo's freeze) increases persistence rather than reducing it. This directly validates a "grace period" for recurring quests: skipping one day doesn't break the streak, but two in a row does. People complete more work with streak incentives than stable rewards across six studies with ~4,500 participants. ([Marketing Monsters](https://marketingmonsters.io/blog/the-science-behind-streak-based-motivation))

**Short-term framing outperforms indefinite.** Framing recurring quests as short-term achievements ("7-day streak!" "30-day challenge!") is more effective than indefinite "do this forever." Milestone celebrations at 7, 14, 30 days maintain motivation as daily increments become mathematically smaller. Individual differences matter: identity relevance, self-improvement beliefs, and need for structure all affect commitment. ([Journal of the Academy of Marketing Science, 2024](https://ideas.repec.org/a/spr/joamsc/v52y2024i2d10.1007_s11747-023-00944-4.html))

**Habit degradation is fastest in the first week.** Specific degradation strategies (substitution, inhibition, reduced accessibility) produce steeper declines during the first week of intervention. This means the ghost can detect habit decay early — the first 2–3 consecutive skips are the critical signal, not the 10th. ([Communications Psychology, 2026](http://www.nature.com/articles/s44271-026-00432-9))

### Journal — The Story That Writes Itself

_Potentially a separate feature system, not part of quests._ An adventurer-style diary/summary — the ghost writing a narrative account of what happened each day, the storylines that advanced, the quests embarked on, the memories formed, the pack interactions. Written during night hours or at the end of an active period. The deep story progression thing where the narrative arc emerges from accumulated days of real experiences.

This is NOT a quest system concern — it's a cross-system narrative synthesis that reads from quests, sessions, memories, pack, and souls to produce a coherent journal entry. It would need:

- **A dedicated soul** — a historian, chronicler, or scribe. Someone whose purpose is narrative synthesis, not task management. Reads from everything, writes the journal.
- **A dedicated `journal` table** — entries with dates, narrative text, references to the day's events. Simple schema: date, content, metadata.
- **Genuine narrative quality.** This must be cool, not try-hard. An AI writing "Dear diary, today I helped my human..." is cringe. An AI writing a terse, evocative field report of the day's operations — the way a ghost wolf would log its experiences — could be genuinely compelling. The tone comes from the historian soul's essence.
- **Read-only for other systems.** The journal is an output, not an input. Other systems don't query it for decisions. It exists for the human's enjoyment and for long-term narrative continuity. Opening the journal and reading three months of your ghost's adventures should feel like reading a book that wrote itself.

This belongs in its own `JOURNAL.md` feature document when the concept matures. Noted here because it emerged from the quest system's "story progression" quality — but it transcends quests. It's the narrative layer on top of everything.

### Quest Board — Research Foundation

The Quest Board sits at the intersection of three research domains: cognitive offloading, proactive AI suggestion design, and RPG quest discovery mechanics.

#### The Psychology of Task Capture (Corrected Science)

**The Zeigarnik Effect (memory advantage for unfinished tasks) is NOT reliably supported.** A 2025 meta-analysis across 38 publications found a weighted recall ratio of 0.99 — essentially no difference between interrupted and completed tasks. Effect size dz = 0.15 (negligible). Zeigarnik's original 1927 metric was susceptible to outlier inflation. The effect only appears under very specific circumstances (relaxed settings, high achievement motivation) — it is NOT a universal phenomenon. ([Nature Humanities & Social Sciences Communications, 2025](https://www.nature.com/articles/s41599-025-05000-w))

**The Ovsiankina Effect (tendency to RESUME interrupted tasks) IS robustly confirmed.** 67% resumption rate across 21 publications, well above the 50% chance baseline. People reliably want to go back and finish what they started. This is a behavioral drive, not a memory advantage — and it's the more relevant finding for quest engagement. Interrupted tasks create a pull toward completion. The Quest Board's `?` yellow turn-in marker exploits this directly. ([Nature Humanities & Social Sciences Communications, 2025](https://www.nature.com/articles/s41599-025-05000-w))

**Implementation intentions neutralize intrusive thoughts from open goals.** Masicampo & Baumeister (2011) demonstrated that you don't need to complete a task to reduce its cognitive burden — simply making a concrete plan neutralizes the effect. Implementation intentions transfer goal control from conscious to automatic processing. Quest capture IS the concrete plan: the ghost externalizes the commitment into a quest with a title, temporal metadata, and a storyline context. The brain can let go because the plan exists. ([JPSP, 2011](https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf))

**Cognitive offloading improves task performance — but creates dependency.** Externalizing information to external stores reduces working memory load and improves performance. But people strategically choose what to offload based on value vs. cognitive effort — higher-value items and higher mental load trigger more offloading. The trade-off: relying on external stores weakens internal encoding, and unexpectedly losing access produces worse outcomes than never offloading. This means the quest system must be trustworthy and persistent — if the ghost drops a quest, the user's internal encoding of it is already degraded. ([Nature Reviews Psychology, 2025](https://www.nature.com/articles/s44159-025-00432-2))

**GTD's key insight: trust is the mechanism.** David Allen's capture system only works when you genuinely believe it will resurface items at the right time. If trust erodes, you revert to holding tasks mentally. The ghost's proactive temporal awareness — overdue detection, reminders, haunt-driven quest reconciliation, stale quest surfacing — IS the trust mechanism. The user learns the ghost won't forget, which makes cognitive offloading safe. Working memory holds ~4 items; knowledge workers manage hundreds of tasks. The mismatch is the problem. The quest system is the solution — but only if trusted. ([Super Productivity / GTD research](https://super-productivity.com/blog/gtd-inbox-capture-system/))

#### Inbox Anxiety vs. Opportunity Space

**Processing anxiety is real and measurable.** 80.8% of workers feel anxiety about unprocessed inboxes. Employees with 50+ unread items report 23% higher cognitive load and 17% lower task completion rates. Knowledge workers check email 74 times daily, each check forcing micro-decisions about urgency and timing. Manual Inbox Zero maintenance costs 1.5-2.5 hours daily in triage time. ([Readless, 2026](https://www.readless.app/blog/inbox-zero-statistics-2026))

**Decision fatigue compounds the problem.** The volume of sequential decisions depletes cognitive resources (ego depletion effects confirmed in 2024-2025 meta-analyses using demanding tasks across 2,078 participants worldwide). Choice overload leads to decision paralysis, heightened anxiety, and post-choice regret. ([J. Neuroscience, 2025](https://www.jneurosci.org/content/45/24/e1612242025.full.pdf); [Global Council for Behavioral Science](https://gc-bs.org/articles/the-depleted-mind-the-science-of-decision-fatigue-and-ego-depletion/))

**The Quest Board must therefore NOT be an inbox.** An inbox creates processing obligation — everything must be triaged. The Quest Board should be an **opportunity space** — things exist there, they can sit indefinitely, there is zero processing anxiety. No notification count, no unread badge, no guilt. The interface: accept or dismiss. Two actions. No prioritize/categorize/schedule/assign/tag. Minimal decision surface eliminates decision fatigue.

#### Proactive AI Suggestion Timing

**Workflow boundary suggestions: 52% engagement. Mid-task suggestions: 62% dismissal.** A 2026 five-day field study with professional developers (229 AI interventions across 5,732 interaction points) found that proactive suggestions at workflow boundaries (post-commit, between tasks) achieved 52% engagement. Mid-task interventions were perceived as intrusive "advertisements" and dismissed 62% of the time. Well-timed suggestions required 45.4s interpretation vs 101.4s for reactive suggestions — 2.2x cognitive alignment improvement. ([arXiv:2601.10253](https://arxiv.org/abs/2601.10253))

**For the Quest Board:** The ghost should propose quests at natural boundaries — end of conversation, haunt cycle, session consolidation — NOT mid-conversation. The board accumulates proposals asynchronously. The user pulls from it when ready. This is pull-based content delivery with push-origin — the ghost pushes proposals, the user pulls when receptive.

#### Trust Calibration for AI Suggestions

**Optimal team accuracy (84.14%) occurs at intermediate confidence thresholds.** AI recommendations should be accepted when confidence exceeds threshold; otherwise defer to human. Trust-adaptive interventions achieved 38% reduction in inappropriate reliance and 20% accuracy improvement. Systems should adapt behavior based on detected trust: low trust → provide supporting explanations; high trust → insert counter-explanations to reduce over-reliance. ([IJACSA, 2025](https://thesai.org/Publications/ViewPaper?Code=IJACSA&Issue=12&SerialNo=122&Volume=16); [arXiv:2502.13321](https://arxiv.org/html/2502.13321v2))

**For the Quest Board:** The ghost's proposals should carry implicit confidence signals. A high-confidence observation ("You mentioned a deploy deadline Friday — should I track that?") is different from a speculative inference ("You seem stressed about the project — maybe break it into smaller pieces?"). The marker system (yellow `!` vs grey `!`) could map to confidence level. Over time, the ghost's proposal quality improves through soul evolution — the warden learns what the user accepts vs dismisses.

#### RPG Quest Discovery — Push vs. Pull Content

**WoW's core lesson: "Make completing quests the smart way to play."** Blizzard evolved from exploration-based content to fully quest-driven gameplay by tuning rewards so players naturally follow the intended path. The game shipped with 2,600 quests, grew to 7,650, with 16 million quests completed daily. Visual indicators (! and ? markers) solved the critical problem of making quest availability instantly visible. ([GDC: Learning From WoW's Quest Design Mistakes](https://www.gamedeveloper.com/game-platforms/gdc-learning-from-i-world-of-warcraft-i-s-quest-design-mistakes))

**Push vs. pull mechanics in game design.** Push content: NPCs tell you what to do (directed gameplay). Pull content: the world makes you curious (player-driven exploration). Effective systems combine both — the ghost pushes proposals to the board (NPC agency), the human pulls at their own pace (player agency). This respects autonomy while providing direction. ([Game design research](https://vocal.media/gamers/how-to-design-a-dynamic-quest-system-that-feels-alive))

**Dynamic quest systems use contextual triggers.** Quests appear based on player behavior, not on a fixed schedule. The ghost's quest proposals emerge from conversation context, haunt observations, temporal awareness, and pack dynamics — contextually grounded, not random. NPC relationship systems remember player interactions and adjust future quests based on reputation — the soul evolution system provides exactly this adaptation. ([Academic quest design patterns](https://users.soe.ucsc.edu/~ejw/papers/smith-situating-quests-icids-2011.pdf))

#### Choice Architecture and Nudges

**Defaults create a "golden halo effect"** — positive value boost through altered attention and valuation. The ghost's proposal framing IS the default — how it describes a potential quest shapes acceptance likelihood. This is choice architecture through natural language, and it improves through soul evolution. Transparent nudges perform similarly to non-transparent ones, so the ghost can be explicit about why it's proposing something without losing effectiveness. ([Nature Reviews Psychology, 2025](https://www.nature.com/articles/s44159-025-00471-9.pdf); [LSE, 2025](http://eprints.lse.ac.uk/126086/3/sullivan-et-al-2025-the-golden-halo-of-defaults-in-simple-choices.pdf))

**Autonomy preservation is critical.** Digital nudges are perceived favorably when designers emphasize choice autonomy. The Quest Board's two-action interface (accept/dismiss) preserves full autonomy — the ghost never forces a quest. Forced active choosing can mitigate welfare losses — offering a clear accept/dismiss decision is better than auto-accepting proposals. ([Cambridge Core, 2024](https://www.cambridge.org/core/journals/behavioural-public-policy/article/options-to-design-more-ethical-and-still-successful-default-nudges-a-review-and-recommendations/E2B1E2A9CDFAD5C79C0D4B3C0B05F027))

### The Automation Paradox — Critical Design Pitfall

This is the single most dangerous failure mode of the quest system. If ignored, every other mechanism we've designed works AGAINST the human.

**The paradox:** Automation increases system complexity and reduces human involvement, which degrades human understanding of how the system works. When the automation fails — and it WILL fail — the human lacks the knowledge to intervene effectively. The more reliable the automation, the worse the problem, because higher reliability means less practice, which means less competence at manual intervention. ([Wikipedia/Bainbridge 1983](https://en.wikipedia.org/wiki/Automation_paradox); [ResearchGate](https://www.researchgate.net/publication/256843906_Ironies_of_Automation))

**This is not theoretical — it's measured.** A 2024 randomized experiment found GitHub Copilot reduced security awareness in developers by 12–20%. Users write functional code faster but understand its implications less. Automation didn't just change speed — it changed what developers knew. ([arXiv:2405.15349](https://arxiv.org/pdf/2405.15349))

**The quest system is an automation engine.** The delegation incentive, the XP differential, the visual nudges — they all push toward "let the ghost do it." Which is the point: autonomous capability growth. But the dark side: if the ghost handles all deploys for 6 months, the human can't deploy manually anymore. If the ghost writes all the tests, the human forgets the testing patterns. The ghost gets smarter. The human doesn't. When the ghost blocks on something novel, the human can't help.

**Progressive offloading erodes competence in the offloaded domain.** Cognitive offloading research confirms: reliance on external stores weakens internal encoding, and unexpected loss of access produces worse outcomes than never offloading. ([Nature Reviews Psychology, 2025](https://www.nature.com/articles/s44159-025-00432-2)) This is the same phenomenon at the skill level. The human offloads "deploy" to the ghost. Their internal "deploy" skill atrophies. When the ghost blocks, the human's degraded skill makes them a worse intervention partner than if they'd never delegated.

#### Mitigations We Must Build

**1. Ghost as teacher, not just executor.** When the ghost completes a quest, the turn-in should include a brief "what I did and why" explanation — not just XP and drops, but an accessible summary of the approach. The human reads this during turn-in. Over time, they build _conceptual_ understanding even without hands-on practice. The journal feature feeds into this too — the narrative record is educational even when passive.

**2. "Pair mode" for delegated quest types.** When the ghost detects a quest type it's handled N times autonomously, it suggests a "pair quest" — the human works alongside the ghost instead of pure delegation. Lower XP, but the human stays in the loop. This could be a warden behavior: "I've handled 8 deploy quests solo. Want to pair on the next one so you stay current?" This is the flight simulator principle — pilots who fly automated planes still train on manual procedures regularly.

**3. Adaptive delegation offers based on human competence signals.** If the human always says "I'll do it" for a certain quest type, the ghost respects that boundary AND recognizes it as a competence-maintenance signal. If the human always delegates a type, the ghost periodically nudges toward engagement. The ghost tracks _delegation patterns per quest archetype_ to detect domains where the human is fully disengaged.

**4. Transparent capability boundaries.** When blocked, the ghost must explain _clearly_ what's happening and what the human needs to understand to unblock. No "please fix this" — instead "the deploy failed because X, which happens when Y, and the two options are A and B, here's what each means." The blocked state is a forced learning moment.

**5. Never automate understanding.** The ghost can automate execution but should never automate comprehension. The turn-in always produces a human-readable narrative. The journal always explains what happened. The ghost answers "why did you do X?" questions as part of its natural behavior. The human might not DO the work, but they should always be able to UNDERSTAND the work.

**Design principle:** The XP system incentivizes delegation. The automation paradox says unchecked delegation is dangerous. The resolution: the ghost should be a teacher who also does the work, not just a worker. Skills, traits, journal entries, turn-in narratives, pair mode — these are the teaching mechanisms. The human gets their time back AND stays informed. This is the differentiator: not just a capable agent, but a capable agent that makes its human more capable too.

### Progress Visualization — The Goal-Gradient Effect

**Motivation accelerates as people approach their goal.** The "goal-gradient hypothesis" is one of psychology's most replicated findings: effort increases as perceived distance to completion decreases. Café customers purchase coffee 20% faster in the last half of their loyalty card. Runners increase speed in the final stretch. The closer you are, the harder you push. ([Columbia Business School, 2006](https://www.columbia.edu/~ck2099/); [Wikipedia](https://en.wikipedia.org/wiki/Goal_pursuit#Goal_gradient_effect))

**"Endowed progress" amplifies the effect.** People given a 12-stamp card with 2 stamps filled outperform those given a 10-stamp blank card (same distance to completion). The illusion of a head start increases completion rates significantly. When a storyline is created, showing "1 of N quests defined" (even before any work) creates endowed progress. When subgoals populate, the partially-filled checklist creates the same effect. ([Nunes & Drèze, Journal of Consumer Research, 2006](https://doi.org/10.1086/500480))

**Visible progress bars increase completion probability.** LinkedIn profiles increase completion from ~20% to 55%+ when a progress bar is shown. The effect is strongest when progress is concrete (3/7 subgoals done) rather than vague (43% complete). Subgoals checking off during quest execution IS the progress bar — each checked subgoal narrows the perceived gap and increases motivation. ([Nir Eyal, 2013](https://www.nirandfar.com/how-to-design-for-the-goal-gradient-effect/))

**WoW's sequential quest chain design validates strict ordering.** Quest chains in WoW are strictly sequential — you cannot start "The Final Blow" without completing "Gathering Intel" and "Sabotaging Defenses" in order. This creates narrative coherence (each quest builds on the prior), clear progress signals (you know exactly where you are), and the goal-gradient effect (each completed quest moves you visibly closer to the chain's climax). Strict storyline ordering isn't a limitation — it's a motivational mechanism. ([WoW Quest Design, various](https://wow.zamimg.com/uploads/guide/images/28066.jpg))

**Implication for the quest system:** Storyline progress should be prominently visualized — "Quest 3 of 7 in [Storyline Name]" with a progress indicator. Subgoal completion within an active quest should be visible in real-time. The combination of storyline-level progress (macro) and subgoal-level progress (micro) creates two simultaneous goal-gradient effects, each reinforcing the other.

### Gamification Pitfalls — What Can Go Wrong

**The Overjustification Effect is real and measured.** Adding external rewards (XP, badges, leaderboards) to intrinsically motivated activities can REDUCE motivation by shifting perceived locus of control from internal to external. Meta-analyses confirm this especially for tasks that are inherently interesting or meaningful. The risk: a human who enjoys deploying code starts seeing it as "grinding for XP" instead, and enjoyment drops. ([Deci, Koestner & Ryan, 1999](https://psycnet.apa.org/record/1999-01567-001))

**Mitigation:** XP should feel like a natural byproduct, not the reason for doing things. The ghost never frames tasks as "do this for XP." Storyline progression (meaningful narrative) is the primary reward. XP is secondary. Trait/skill drops are rare surprises, not expected. The quest system should feel like "getting things done effectively" with rewards as a pleasant side effect, not "grinding for points."

**Pointsification vs. meaningful gamification.** "Slapping points and badges" on activities produces short-term engagement bumps that decay within weeks. Genuine gamification (autonomy, mastery, purpose — Self-Determination Theory) produces lasting behavioral change. The quest system MUST stay on the SDT side: autonomy (human chooses what to delegate), mastery (ghost gets demonstrably better), purpose (storylines provide "why"). If it ever feels like a points treadmill, the design has failed. ([Deterding, 2012](https://www.cs.auckland.ac.nz/courses/compsci747s2c/lectures/paul/Gamification-CMU.pdf))

**Leaderboards and social comparison backfire for bottom performers.** If the system ever adds comparative elements (daily XP rankings, etc.), research consistently shows bottom-50% performers DECREASE effort. The quest system is single-user, which avoids this entirely — but any future social features must be careful.

### Cost Estimation and Budget Transparency

**LLM cost prediction has high variance.** Token cost depends on model, context window usage, tool call frequency, and retry patterns — all of which vary significantly between quest types and even between runs of similar quests. Pre-embark estimates should be presented as RANGES, not point values: "~$2–6 estimated." A quest that was estimated at $3 but costs $12 due to retries erodes trust. Wide honest ranges are better than narrow dishonest ones.

**The cost-transparency design:** The XP formula's dimensions (estimated tokens, tool calls, sessions) can be projected forward to estimate cost. Store `estimated_cost_low` and `estimated_cost_high` on the quest record. Update when the quest description changes. Show before embark: "This quest looks like ~150–300 XP, roughly $2–6 at current pricing." If remaining daily budget is below the high estimate, warn: "This might exceed today's remaining budget of $X." Never prevent execution — the human decides.

### Loot Drop Frequency — Getting the Reward Schedule Right

**Optimal drop rates follow a diminishing-returns curve.** Too frequent: drafts lose perceived value. Too rare: users stop associating quest completion with rewards, engagement drops. Game design consensus: ~15–25% of substantial quests should produce drops. Trivial quests (few tokens, quick completion) almost never drop. Complex multi-session quests with novel domains are the richest sources. ([PulseGeek, 2025](https://pulsegeek.com/articles/how-to-set-loot-table-probabilities-responsibly/))

**Reward variety prevents habituation.** If every drop is a trait draft, users habituate. Drops vary across categories (trait drafts, skill drafts) and within categories (different souls, different domains). Each turn-in retains novelty because the underlying quests are diverse.

**Quality over quantity.** A single trait draft that genuinely improves the ghost's performance is worth more engagement than 10 generic observations. The warden should be calibrated to produce fewer, higher-quality drops. Each draft should feel like it matters.

### Narrative Identity and the Journal

**Reflective writing improves psychological well-being, cognitive processing, and personal growth.** Pennebaker's expressive writing paradigm is one of psychology's most replicated findings: structured reflection on experiences produces measurable benefits including improved mood, better working memory, and clearer goal articulation. AI-guided journaling extends this — MindScape found significant increases in self-awareness and self-reflection with AI-structured narrative prompts. ([Nature Digital Medicine, 2024](https://www.nature.com/articles/s41746-024-01255-2))

**Life-logging data improves autobiographical memory retrieval.** SenseCam studies found images captured throughout the day improved episodic memory significantly. The journal serves as a narrative SenseCam — even if the human doesn't read every entry, knowing the record exists provides memory support and continuity.

**Narrative identity is how humans construct meaning from experience.** People who can articulate a coherent narrative about their life experiences show higher well-being, better goal adjustment, and greater resilience. The ghost's journal entries — if written well — provide the raw material for the human to construct a narrative about their partnership with the ghost. "Three months ago I couldn't deploy without anxiety. Now Ghostpaw handles it and I focus on architecture." That's narrative identity formation in action.

---

## Future Design

The crystallized high-level design, integrating every concept, research finding, and decision from above into a single coherent picture. This is the system we are building toward.

**Chat is the primary interface.** Most users interact with ghostpaw through messaging apps (Telegram, WhatsApp). The web UI is a power-user luxury, not the default. This means: the quest board is a conversational surface ("what's on my board?"), turn-in is a chat verb ("turn in quest 42"), progress is a question ("how's my infrastructure storyline?"), and zero-wait is essential — in chat, a slow response is silence, not a spinner. Every quest interaction is designed to work as natural conversation first, with visual UIs as optional rich surfaces on top.

### 1. One Entity, Three Levels

A quest is a quest. Task, event, deadline, reminder, recurring commitment — distinguished only by which optional fields are populated. No calendar/todo split. One schema, one set of tools, one mental model. The temporal fusion is the architectural thesis, not a feature.

Three abstraction levels, each with a distinct stability:

- **Storyline** (stable) — the "why." A campaign, project, or theme. Rich markdown context. Complete when its quests achieve the overarching goal.
- **Quest** (semi-stable) — the "what." A scoped deliverable within a storyline or standalone. Title, description, status lifecycle, temporal metadata. Can be added or removed as the plan evolves.
- **Subgoal** (volatile) — the "how." Dynamic execution checkpoints within a quest. Text + done + position. Managed by the warden during execution. Grow, shrink, reorder, check off. The mechanism that keeps the LLM self-organized.

### 2. RPG Vocabulary Everywhere

Consistent WoW-native language across schema, tools, CLI, web UI, docs:

- `quest_logs` → **storylines**
- `cancelled` → **abandoned**
- `pending` → **accepted**
- `blocked` stays (unifies "stalled" — one state, many reasons)

**Quest markers as system-wide visual language:**

| Marker     | Meaning                                   |
| ---------- | ----------------------------------------- |
| `!` yellow | Ghost proposes a new quest (board)        |
| `!` grey   | Quest exists but not yet actionable       |
| `!` blue   | Recurring quest instance due              |
| `?` grey   | Quest accepted/active/paused, in progress |
| `?` yellow | Quest done, ready for turn-in             |

Computed from state, never stored. Every quest in every view carries its marker.

### 3. The Zero-Wait Principle

**Every user-facing action must be instant.** No spinners, no "waiting for the ghost to think." The system achieves this by front-loading all computation into the process that naturally precedes the moment the user acts. When data is presented, it is already ready for the next step.

This means every state transition pre-computes what the subsequent transition will need:

| Transition                             | What gets pre-computed                                                                                                           | When it runs                                                           | Why the next step is instant                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Quest creation** (offered)           | Estimated XP range, estimated cost range                                                                                         | During the haunt/conversation that spawned it                          | Board entries display rewards immediately                                                 |
| **offered → accepted** (chat)          | Enriched description, concrete plan, tightened estimates                                                                         | Warden call during the acceptance conversation                         | This IS the conversation — user is already talking to the ghost                           |
| **offered → accepted** (button)        | Status flips instantly; enrichment runs async in background                                                                      | Background warden session, completes in seconds                        | UI updates immediately. Enrichment ready before next prowl tick                           |
| **accepted/paused → active** (embark)  | Session created, context briefing assembled                                                                                      | Prowl spawns `quests embark <id>` via scheduler                        | CAS on status. Work proceeds in background                                                |
| **Step validation** (during execution) | Subgoal state updated, progress recorded                                                                                         | Part of the execution loop between steps                               | Progress is always current when queried. Subgoals ARE the checkpoint                      |
| **active → paused**                    | Subgoals already current (last validated step)                                                                                   | Preemption, timeout, or crash — scheduler sets status                  | Continuation reads subgoal state, picks up where left off                                 |
| **active → done**                      | Quest XP computed, memories extracted, trait/skill drafts stashed (sealed), storyline impact assessed, turn-in narrative written | Phase 2 + Phase 3 of the embark process BEFORE state changes to `done` | Turn-in is instant — everything is already computed and stored                            |
| **done → turned_in**                   | Nothing to compute                                                                                                               | Pure state change + reveal                                             | Instant. Reveals sealed drafts in domain modules. Shows pre-written narrative and rewards |
| **active → blocked**                   | Reason, diagnostic, suggested unblocking options                                                                                 | Part of the warden's blocking decision (3 rejections or unrecoverable) | Blocked state is immediately queryable with full context                                  |
| **active → failed**                    | Failure analysis, partial XP from sessions                                                                                       | Final steps before state change, same as `done`                        | Failed turn-in is also instant                                                            |

**The critical insight: the embark process ends with a full warden evaluation, not just a status flip.** The last thing a `quest embark` does before setting `done` or `failed` is run the complete turn-in evaluation — holistic plan-vs-reality judgment, memory extraction, trait/skill draft stashing (sealed), storyline assessment, and a human-readable turn-in narrative. Narrative and XP stored on the quest record. Drops stashed sealed in their domain modules. The user's "turn in" action then reveals the sealed drafts, flips the status, and presents the rewards. No LLM call needed at turn-in time.

**Exception: human-executed quests.** When the human says "I finished quest #42," there are no sessions to evaluate. The warden runs a lightweight conversational turn-in (asks what happened, captures the narrative). This IS the conversation the human is already having — not a separate wait. XP is minimal (pure function, instant). No trait/skill drops. The only LLM work is the warden's memory extraction from the human's report, which happens within the chat turn.

### 4. XP as a Universal Session Metric

XP is not a quest concept — it is a **session concept**. Every session the ghost runs produces learning material. A freeform chat about architecture produces XP. A haunt cycle produces XP. A quest embark produces XP. The formula is the same everywhere.

**`calculateSessionXP()` lives in `lib/xp.ts` as a pure function.** No LLM call, no database access, no side effects. Takes session metrics that already exist on the sessions table:

```
calculateSessionXP({
  tokensIn,          // already stored: sessions.tokens_in
  tokensOut,         // already stored: sessions.tokens_out
  reasoningTokens,   // already stored: sessions.reasoning_tokens
  costUsd,           // already stored: sessions.cost_usd
  toolCallCount,     // derivable: COUNT messages WHERE role = 'tool_call'
  toolCallDiversity, // derivable: COUNT DISTINCT tool names in tool_data
  errorCount,        // derivable: COUNT messages WHERE role = 'tool_result' AND content indicates error
  durationMs,        // derivable: closed_at - created_at
  purpose,           // already stored: sessions.purpose
}) → number
```

All inputs are either direct columns on the sessions table or single-query derivable from the messages table. The function applies Weber-Fechner logarithmic scaling, weights dimensions, and returns an integer. Deterministic. Testable. Reusable.

**New column on sessions: `xp INTEGER NOT NULL DEFAULT 0`.** Computed and stored when the session closes (`closed_at` is set). Alongside the existing `tokens_in`, `tokens_out`, `reasoning_tokens`, `cached_tokens`, `cost_usd` — XP becomes just another metric on the session record. Every closed session has its XP. Always.

**New column on sessions: `quest_id INTEGER REFERENCES quests(id)`.** Nullable. Links quest execution sessions to their quest. Freeform sessions have `quest_id = NULL`.

**`calculateQuestXP()` also lives in `lib/xp.ts`.** Quest XP is NOT just the session sum — two critical dimensions exist at the quest level, not the session level:

- **Novelty** — a quest in a domain the ghost hasn't worked in before is worth dramatically more. A pure SQL query: how many prior turned-in quests share similar tags or storyline domain? First-in-domain quests get a higher multiplier. The 50th routine deploy gets baseline. This is the engine that rewards exploration over repetition.
- **Subgoal count** — more subgoals = more structured work = richer checkpoints = more organized learning surface. A quest with 7 checked-off subgoals produced more decomposed learning than a binary quest.

```
calculateQuestXP({
  sessionXPSum,      // SUM(xp) FROM sessions WHERE quest_id = ?
  noveltyScore,      // 0.0–1.0, pure SQL on quest tag/domain history
  subgoalCount,      // COUNT from quest_subgoals
}) → number
```

The session sum is the base material. The quest function applies a multiplier (1.0x baseline to ~2.0x for high-novelty, structurally complex quests) and returns the final quest XP. The bonus XP (quest XP minus session sum) is real — it adds to the ghost's total. Computed in Phase 3 (Finalize) — pure code, no LLM. Both functions deterministic, testable, same file.

**Novelty score — pure SQL on quest tables only.** Two signals, both within the quest module's own data:

- **Storyline familiarity:** `COUNT turned-in quests with the same storyline_id` / normalization. First quest in a new storyline = max novelty. The 10th = low.
- **Tag familiarity:** for each tag on the quest, `COUNT turned-in quests WHERE tags LIKE '%tag%'`. Average across tags. Tags seen many times = low novelty. Tags never seen = high.
- Combined: `noveltyScore = 1.0 - (storyFamiliarity * 0.5 + tagFamiliarity * 0.5)`, clamped 0.0–1.0.

No cross-module queries. No embeddings. LIKE queries on a few hundred quests are instant in SQLite. The novelty score naturally decays as the ghost accumulates experience — first quest in a new area is exciting, later ones are routine. Self-correcting. Fresh ghosts get maximum novelty on everything (zero prior quests in any domain), which means early quest runs naturally yield the highest multipliers without any artificial front-loading.

**Total ghost XP = SUM(session.xp) + SUM(quest bonus XP).** Session XP is the universal base — every closed session contributes. Quest bonus XP (the novelty/complexity multiplier above 1.0x) is real additional XP that adds to the total. This makes quests the genuinely highest-yield XP source: they produce more session XP per token (focused, tool-heavy, error-rich) AND get a quest-level bonus on top. Freeform chats, haunts, consolidation produce session XP only. The incentive is real, not cosmetic.

**`estimateQuestXP()` also lives in `lib/xp.ts`.** Takes quest description, estimated complexity tier, historical averages for similar quests. Returns a range `{ low: number, high: number }`. Same logarithmic scaling, projected inputs instead of actual. Used for pre-embark display and cost estimation.

**Cost estimation reuses the same dimensions.** `estimateQuestCost()` in `lib/xp.ts` inverts the complexity projection: estimated token volume at current model pricing → dollar range. Takes an optional `calibrationFactor` (defaults to 1.0) for historical accuracy correction. Stored as `estimated_cost_low` and `estimated_cost_high` on the quest record. Updated when the description changes. Shown before embark.

### 5. The Lifecycle

```
offered → accepted → active → done → turned_in
  ↘ abandoned          ↕ paused (checkpoint)
  (dismiss/stale/      ↕ blocked (reason + suggestions)
   withdraw)           ↘ failed → turned_in
                       ↘ abandoned
```

Key transitions and what each pre-computes for the next:

- **offered → accepted:** Warden enriches the quest into a concrete plan. Estimated XP range and cost range computed (pure function) and stored on the quest. The enrichment IS the conversation — no separate wait.
- **accepted → active:** Prowl spawns `quests embark <id>` as a child process (ghost-driven), or human starts working manually. Embark startup does a CAS: `UPDATE quests SET status = 'active' WHERE id = ? AND status IN ('accepted', 'paused')`. If zero rows affected, the process aborts — another embark already claimed it. No race conditions.
- **active → paused:** Clean stop at a step boundary (between warden validation checkpoints). Subgoal state is the checkpoint — it always reflects the last validated step. The session closes normally. The quest sits in `paused` until prowl resumes it. Triggered by: preemption (prowl needs the slot), process timeout (scheduler kills the process), or process crash (scheduler detects dead process). All three produce the same result: quest in `paused`, subgoals current, ready for continuation.
- **paused → active:** Prowl spawns a new embark session. Context assembly reads the subgoal checklist — checked items are done, unchecked items remain. The warden briefs the coordinator on what's already completed and what's next. Continuation, not restart. Same CAS on status.
- **active ↔ blocked:** Irreversible without human action. Rich context (reason, diagnostic, suggestions) written before the state change. Three consecutive warden rejections on the same sub-task, or an unrecoverable external failure. Queryable immediately. Human unblocks → status returns to `accepted` → prowl picks it up.
- **active → done:** The embark process runs Phase 2 (warden evaluates plan vs. reality, extracts memories, stashes trait/skill drafts sealed in domain modules, writes turn-in narrative) then Phase 3 (quest XP computed with novelty multiplier, results stored on the quest). State changes to `done` only AFTER everything is ready. The `?` yellow marker appears and the quest is fully turn-in-ready with zero additional computation.
- **done → turned_in:** Instant. Reveals sealed drafts in domain modules (`traits.reveal()`, `skills.reveal()`). Shows pre-written narrative and rewards. Pure state change + flag flips, no LLM call.
- **failed → turned_in:** Same as `done → turned_in`. The failure evaluation was pre-computed during the embark's final phase.
- **offered → abandoned:** Two paths. Human dismisses (button or chat) → drawer. Warden withdraws its own proposal when context invalidates it (deadline passed, user handled it externally). `ghostpaw quests tend` auto-dismisses stale entries (no deadline + older than 14 days). All produce `abandoned` — distinguished from genuinely abandoned accepted quests by data: `created_by = 'ghost'` + no linked sessions + never reached `accepted`.
- **any → abandoned:** Human intentionally gives up. Always through warden. Storyline impact assessed.

### 6. All Mutations Through the Warden

No direct DB writes for quest data. CLI, web UI, and chat are dispatchers for natural language commands to the warden. The warden:

- Captures creation context that direct CRUD loses
- Deduplicates and normalizes
- Enriches descriptions at acceptance (computes XP/cost estimates as part of enrichment)
- Evaluates cross-system effects (memories, pack bonds, storyline state)
- Validates step-by-step during execution
- Runs the holistic evaluation as the final step of embark (not at turn-in time)

### 7. The Quest Board as Opportunity Space

Not an inbox. Not a GTD capture bucket. A low-pressure space where the ghost autonomously surfaces things worth tracking. The ghost is the NPC. The board is the bulletin board in the town square.

**Population.** The ghost populates the board autonomously, FYI-style, no permission needed. Proposals emerge during haunt cycles, session consolidation, and mid-conversation observations — always within already-running LLM sessions, zero incremental cost. The warden checks existing quests (`quest_list`) before creating to prevent duplicates. Estimated XP/cost computed at creation time as ballpark ranges (pre-enrichment, order-of-magnitude precision). Board entries display rewards immediately.

**Human quest creation bypasses the board entirely.** "Track this for me" → warden creates quest directly in `accepted` state with full context enrichment inline. The human has a direct line to the ghost — they don't need a bulletin board.

**Acceptance — two paths, one outcome.**

- **Chat acceptance:** User says "accept quest #42" in conversation. The warden enriches it into a concrete plan within the same chat turn. Estimates tighten. Zero-wait — this IS the conversation.
- **Button acceptance (CLI/web UI):** Status transitions to `accepted` instantly. The UI shows the marker change immediately. A background warden session enriches the quest asynchronously — takes seconds, finishes well before the next prowl tick (60s). The quest is embarkable even before enrichment completes (the ghost's original captured context is sufficient), but the enrichment adds the full plan, refined estimates, and subgoal scaffolding.

**Dismiss = soft-delete to a drawer.** Status → `abandoned`. Distinguishable from genuinely abandoned quests by data: `created_by = 'ghost'` + no linked sessions + never reached `accepted`. Old proposals are browsable — someone might go looking for old ideas when bored or wanting more XP.

**Recurring quests never appear on the board** — already committed by definition.

**Warden can withdraw its own proposals.** During any session where context invalidates a proposal (the user handled it outside ghostpaw, the deadline passed, conditions changed), the warden updates the offered quest to `abandoned`. No new mechanism — the warden already has `quest_update` access.

**Board size stays manageable through active consolidation.** When the warden is about to create an offered quest, it checks `COUNT(*) FROM quests WHERE status = 'offered'`. Above a soft cap (configurable, default ~20), the warden is biased toward consolidating related proposals rather than adding new ones — merging two "improve deploy pipeline" and "fix deploy script" entries into one coherent proposal. Important proposals are never dropped because the board is "full" — the warden consolidates, it doesn't discard.

**Board hygiene runs as part of `ghostpaw quests tend`** — see section 10 for the full specification. Pure code, zero tokens: auto-dismisses stale proposals, escalates deadline-approaching ones to howl.

Backed by: Ovsiankina Effect (67% resumption rate drives engagement with `?` markers), Masicampo & Baumeister (implementation intentions neutralize open-loop anxiety), cognitive offloading research (trust in the system is the critical mechanism), GTD (trust as the mechanism for cognitive offloading).

### 8. The Growth Engine

Every session the ghost runs produces XP. This is universal — not quest-specific. **The core value loop:**

```
Any ghost activity → Sessions → XP stored on each session
                              ↘ Soul evolution pipeline
                              ↘ Skill discovery

Quest execution → Focused sessions → Higher XP per session (targeted, tool-heavy, error-rich)
                                   ↘ Drops: trait drafts, skill drafts, memories (sparse, meaningful)
```

Freeform chats, haunts, consolidation, delegations — they all produce sessions with XP. Quests produce _more_ XP per token because quest sessions are focused, tool-heavy, and error-rich. On top of that, quest XP gets a real novelty/complexity bonus from `calculateQuestXP()` that adds to the ghost's total — not just display, real XP. The directed nature of quests makes them the genuinely highest-yield XP source: more session XP per token AND a quest-level bonus on top. Fresh ghosts get maximum novelty on everything — the self-improvement loop starts hot.

Quest drops go directly to the domain modules that own them. No intermediate inventory. Two tiers:

- **High-value drops** (~10% of quests) — trait drafts (→ mentor via `traits.stash_draft()`) and skill drafts (→ trainer via `skills.stash_draft()`). The warden is calibrated to MUSE research (~10% of tasks generate generalizable learning). Genuine novel patterns only.
- **Domain insights** (~15-20% of quests) — written directly as memories by the warden. No staging needed — the warden already manages memory. These are observations, error patterns, approach comparisons that enrich the ghost's factual knowledge.
- **Total drop rate: ~25-30% of quests yield at least one drop.** Most quests yield nothing but XP, and that's fine. Variable reward schedule is neurobiologically correct — spacing rewards prevents habituation.

**Pity system:** a `quests_since_last_drop` counter, incremented on turn-in of dropless quests, reset on any drop. At threshold (e.g. 5 consecutive dry quests), the warden's evaluation prompt gets a nudge: "this ghost hasn't found anything in a while — look harder for patterns." This lowers the bar slightly without fabricating quality. The counter itself is a column on the ghost's config or a simple SQL aggregate. Not a guaranteed drop — just a widened lens.

### 9. The Delegation Gradient

The system makes delegation the convenient default without being pushy:

- **Ghost offers to embark** when quests are created or accepted. Estimated XP and cost are already on the quest record — display is instant.
- **Ghost execution yields full rewards** — high session XP, trait/skill drops, soul evolution, storyline progress.
- **Human execution yields storyline progress only** — minimal XP (narrative-only turn-in), no drops. Still goes through warden.
- **Visual nudge** — "If you do it: ~15 XP. If I embark: ~120 XP + potential drops." Computed from quest estimates, shown without delay.
- **Hamster wheel detection** — pattern recognition surfaces when repeated manual work could be delegated.

Backed by: trust as the strongest delegation predictor, status quo bias overcome by demonstrated competence, AI delegation increasing human self-efficacy, delegation willingness adapting by task type.

### 10. Quest Execution — Supervised Autonomy

#### The Embark Process

`ghostpaw quests embark <id>` spawns a full ghostpaw instance as a scheduled background process. Never blocking. At startup, it does a CAS on quest status: `UPDATE quests SET status = 'active' WHERE id = ? AND status IN ('accepted', 'paused')`. Zero rows affected → another process already claimed it → abort. This eliminates race conditions between prowl, manual embark, and concurrent ticks.

The execution has three phases:

**Phase 1 — Work.** The step-by-step execution loop:

1. **Context assembly** — Warden briefs the coordinator with quest description, storyline description, sibling states, memories, pack info. For continuations (`paused` → `active`): reads the subgoal checklist (WHERE) + `checkpoint_summary` (WHAT). The warden briefs on remaining work with full context of what happened before. No restart.
2. **Step execution** — Coordinator delegates to specialists.
3. **Step validation** — Coordinator checks with warden after EVERY meaningful step. Warden validates alignment with intent, not technical correctness. Subgoals updated (checked off, added, reordered). `checkpoint_summary` updated with a concise record of what this step accomplished. Each validated step is a natural pause point — the quest can be stopped here cleanly at any time.
4. **Repeat until all subgoals done, a blocker hit, or repeated failure.** Three consecutive rejections on the same sub-task → `blocked`.

**Phase 2 — Evaluate.** Runs immediately after the last step, still within the same process:

5. **Warden holistic evaluation** — compares plan against actual trajectory (full session history across all embark sessions for this quest, storyline context). Writes the turn-in narrative. Extracts memories directly (beliefs from the quest experience, informed by the full trajectory — this replaces regular distillation for these sessions, which are excluded from the generic pipeline to prevent double-harvesting). Evaluates whether later quests in the storyline should be revised.
6. **Drop identification** — warden judges if the execution produced patterns worth capturing. Drops go directly to the owning domain module, sealed until turn-in:
   - **Trait observations** → `traits.stash_draft(quest_id, ...)` — sealed in the traits module's `trait_drafts` table. The mentor picks these up after turn-in reveal.
   - **Skill patterns** → `skills.stash_draft(quest_id, ...)` — sealed in the skills module's `skill_drafts` table. The trainer picks these up after turn-in reveal.
   - **Domain insights** → direct memory writes by the warden. No staging needed.
     A quest can produce multiple drops (e.g. one skill draft AND a trait draft from a rich discovery). The warden is explicitly calibrated: most executions are routine. Only quests where genuinely novel patterns, approaches, or domain knowledge emerged produce drops. MUSE research shows ~10% of tasks generate high-value learning (trait/skill drafts), ~15-20% yield domain insights. The warden looks for: new procedural patterns worth codifying, consistent behavioral signals worth proposing as traits, and domain insights that transfer beyond this specific quest.
7. **Session XP already computed** — each session's XP was stored at session close during Phase 1.

**Phase 3 — Finalize.** Pure code, no LLM:

8. **Quest XP computed** — `calculateQuestXP()` takes the session XP sum (across ALL sessions for this quest, including previous embark sessions before pauses), novelty score (pure SQL on quest history), and subgoal count. Returns the final quest XP with novelty/complexity multiplier applied.
9. **Store evaluation results** — turn-in narrative on the quest record. Drops already stashed (sealed) in their domain modules during step 6. Quest XP total and cost total stored on the quest record.
10. **Set state to `done`** (or `failed`).
11. Process exits. Quest is fully turn-in-ready.

#### Pausing and Continuation

Every warden validation checkpoint (Phase 1, step 3) is a natural pause point. The quest can be stopped between any two steps without data loss — the subgoal checklist always reflects the last validated state.

**Three things trigger a pause:**

1. **Preemption** — the prowl needs the slot for higher-priority work. It signals the embark process (via the scheduler). The embark finishes its current step, closes the session, and the scheduler sets the quest to `paused`.
2. **Timeout** — the core scheduler's existing timeout/kill mechanism fires. The process is terminated between steps (or killed if stuck). The scheduler sets the quest to `paused`.
3. **Process crash** — the scheduler's dead-process detection finds a dead PID. The scheduler sets the quest to `paused`. The subgoal state from the last validated step is safe in the database.

All three produce the same result: quest in `paused`, subgoals current, slot freed. The distinction between `paused` and `blocked` is critical: `paused` is automatic and resumable without human intervention. `blocked` requires the human.

**Checkpoint summary.** Subgoals tell the next session WHERE the quest is (what's done, what's remaining). But they don't capture WHAT happened — the diagnosis results, the approach taken, the state of partially modified files. A `checkpoint_summary TEXT` column on the quest record fills this gap. The warden writes a concise summary at every validation step as part of the existing Phase 1 loop — zero additional cost, it's one extra field update alongside the subgoal updates. On pause, the summary is already current. On continuation, the warden reads it during context assembly: "Credential rotation diagnosed as token expiry. promote.sh updated with refresh logic. Next: test staging promotion." One column read, full context restored.

**Continuation is cheap.** The next prowl tick sees the paused quest, spawns a new `quests embark <id>`. The CAS claims it. Context assembly reads the subgoal checklist (WHERE) + checkpoint summary (WHAT). The warden briefs on remaining work with full context. The coordinator picks up mid-quest. Multiple pause/resume cycles are fine — the checkpoint summary is overwritten at each step, always reflecting the latest validated state. Phase 2 evaluation sees the full trajectory across ALL sessions linked to this quest via `quest_id`.

**"Stop starting, start finishing."** Paused quests have the highest priority in the prowl — above deadlines, above everything. Work already in progress must complete before new work begins. This is the scheduling principle that prevents churn.

#### Quest Eligibility — Single Source of Truth

One concept, one query, no duplication. A quest is **eligible for embark** when ALL of the following are true:

```
- status IN ('accepted', 'paused')
- quest_id NOT IN (SELECT quest_id FROM running embark processes)
- IF storyline_id IS NOT NULL:
    all preceding quests in the storyline (lower position) are terminal
    (status IN ('done', 'turned_in', 'abandoned', 'failed'))
- SUM(cost_usd) today + estimated_cost_low <= daily budget
- effective_deadline = COALESCE(quest.due_at, storyline.due_at)
  (used for priority ordering, not eligibility filtering)
```

This is a single SQL query (or view). The prowl uses it. Manual embark from chat uses it. The warden uses it when the user asks "what can I work on?" No logic duplication. The storyline ordering constraint lives HERE, once, and everything else references it. The `COALESCE` ensures storyline deadlines propagate to quest priority without manually setting `due_at` on each quest.

#### `ghostpaw quests prowl` — The Quest Heartbeat

A subcommand under `ghostpaw quests`, shipped as a mandatory default schedule alongside `haunt` and `distill`. Runs every minute. Pure code — no LLM call. An OS-style process scheduler for quest execution.

The ghost prowls the quest board, scanning for prey. A spectral wolf doesn't wait to be told where to hunt.

**The prowl is free.** This IS a heartbeat — but it costs nothing. Every tick is pure code: SQL queries, integer comparisons, process map lookups. No warden, no coordinator, no LLM call, zero tokens. The only tokens spent are inside the `ghostpaw quests embark <id>` processes it spawns — the actual quest work. The prowl decides; the embarks spend. A minute-interval heartbeat that runs 1,440 times a day and spawns maybe 5–20 embarks total costs exactly 5–20 embarks worth of tokens. The other 1,420+ ticks are free.

**Concurrency model.** Configurable `max_concurrent_embarks` (default: 5). The scheduler's existing `Map<id, ChildProcess>` tracks running embark processes, keyed by quest ID. Process lifecycle (timeouts, SIGTERM/SIGKILL deadlines, dead-process detection, slot cleanup, setting quest status to `paused` on process death) is handled entirely by the core scheduling module — the prowl doesn't reimplement any of that. It only decides what to spawn; the scheduler manages what's running.

**Strict heavy slot cap.** Quests classified by estimated cost:

- **Heavy:** `estimated_cost_high > $5` (or configurable threshold)
- **Light:** everything else

At most 3 heavy slots. Always. No overflow, no exceptions. If 3 heavy quests are running, only light candidates get spawned regardless of how many light slots are empty. This is not "reserve 3 for heavy" — it is "heavy may never exceed 3." The remaining slots are always available for light work. A ghost with 3 heavy quests running and 2 light slots open will fill those 2 slots with light quests, never a 4th heavy one.

```
prowl tick:

1. COUNT running embark processes (from scheduler process map)
   → if >= max_concurrent_embarks: return immediately

2. SELECT eligible quests (single query — see Quest Eligibility above)
   effective_deadline = COALESCE(quest.due_at, storyline.due_at)
   ORDER BY priority:
     a. paused (continuation)                                → highest (stop starting, start finishing)
     b. overdue (effective_deadline < now)                    → urgent
     c. approaching deadline (effective_deadline < now + 24h) → high
     d. storyline-first position, no deadline                 → normal
     e. standalone, no deadline                               → low

3. If no eligible quests: return (zero cost)

4. Classify running embarks: heavy_running, light_running
   → heavy_available = 3 - heavy_running (hard cap, never exceeds 3)
   → light_available = max_concurrent_embarks - total_running

5. Walk the priority-sorted list:
   FOR each candidate:
     IF heavy AND heavy_available <= 0: skip
     IF heavy: heavy_available--
     Spawn `ghostpaw quests embark <id>` via scheduler
     light_available-- (all spawns consume a total slot)
     IF light_available <= 0: break

6. Log: "prowl: embarking quest #42 [light] (slot 3/5), continuing quest #17 [heavy] (slot 4/5)"
```

**No LLM involved.** The prowl never asks the warden "should I do this?" — the data answers that question. Estimated cost, deadline proximity, storyline ordering, budget headroom, concurrency slots, pause state — all pre-computed, all queryable. The warden's judgment happens later, INSIDE the embark process. The prowl just decides WHICH embarks to spawn and WHEN.

**Natural throughput balance.** The hard cap on heavy slots plus the "stop starting, start finishing" priority produces the desired mix automatically. Heavy quests get at most 3 slots. The rest are always available for light work. Paused quests resume before any new work starts. A quest that was paused for a higher-priority preemption gets its slot back on the very next tick once the preemptor finishes or pauses. No quest is abandoned — just deferred.

**Prowl as mandatory schedule.** Ships as a built-in:

```
ghostpaw quests prowl  — runs every 1 minute, enabled by default
ghostpaw quests tend   — runs every 30 minutes, enabled by default
ghostpaw haunt         — runs every 30 minutes, disabled by default
ghostpaw distill       — runs every 2 hours, enabled by default
```

Configurable via `ghostpaw schedules update prowl --interval 5m` or `ghostpaw schedules disable prowl`. Ships on by default. A ghost that can do work should do work.

**Subgoals as self-organization.** The warden sees the subgoal checklist at every validation step in Phase 1, adds/removes/reorders dynamically, prevents drift. The coordinator always knows exactly where it is. Across pause/resume cycles, the checklist is the single source of continuity — it survives process death, timeout, and preemption unchanged.

Backed by: Agent drift research (double-digit performance degradation invisible to traditional monitoring), ReVeal (iterative self-verification), PreFlect (prospective reflection from error patterns), handoff research (94% success with explicit context serialization).

#### `ghostpaw quests tend` — Board and Quest Hygiene

A second quest subcommand, shipped as a mandatory default schedule. Runs less frequently than prowl — every 30 minutes. Mostly pure code, zero tokens. Maintains the health of the quest board and the quest landscape. The one exception: storyline completion review triggers a lightweight warden session (rare, only when all quests in a storyline are terminal).

The ghost tends its quest board the way a gardener tends a plot. Prune the dead, water the urgent, leave the rest to grow.

**The tend is nearly free.** Steps 1–3 are pure SQL, zero LLM calls. Step 4 (storyline completion) triggers a warden session only when a storyline finishes — rare event, tiny session, and the warden decides whether to mark complete or add more quests.

```
tend tick:

1. Auto-dismiss stale board entries:
   SELECT FROM quests WHERE
     status = 'offered'
     AND due_at IS NULL
     AND created_at < now - staleness_window (default: 14 days)
   → SET status = 'abandoned' (drawer)

2. Escalate deadline-approaching board entries to howl:
   SELECT FROM quests WHERE
     status = 'offered'
     AND due_at IS NOT NULL
     AND due_at < now + 24h
     AND NOT already_howled (check howl log)
   → Trigger howl: "Quest proposal approaching deadline — accept or dismiss?"

3. Detect stuck active quests (no session activity):
   SELECT FROM quests WHERE
     status = 'active'
     AND updated_at < now - stuck_threshold (default: 2 hours)
     AND quest_id NOT IN running embark processes
   → SET status = 'paused' (prowl will resume on next tick)

4. Detect completed storylines (all quests terminal):
   SELECT FROM storylines WHERE
     status = 'active'
     AND NOT EXISTS (
       SELECT 1 FROM quests WHERE storyline_id = storylines.id
       AND status NOT IN ('done', 'turned_in', 'abandoned', 'failed')
     )
     AND EXISTS (SELECT 1 FROM quests WHERE storyline_id = storylines.id)
   → Flag for warden review (lightweight system session)

5. Log summary: "tend: dismissed 2 stale, howled 1 approaching, unstuck 0, 1 storyline complete"
```

**Tend as mandatory schedule:**

```
ghostpaw quests prowl  — runs every 1 minute, enabled by default
ghostpaw quests tend   — runs every 30 minutes, enabled by default
ghostpaw haunt         — runs every 30 minutes, disabled by default
ghostpaw distill       — runs every 2 hours, enabled by default
```

Tend handles everything that doesn't need minute-level responsiveness: board hygiene, stuck detection, deadline escalation. Prowl handles the hot path: spawning and resuming embarks. Two heartbeats, two cadences, both free.

### 11. The Turn-In — Instant Reveal

The turn-in is the reward moment. **Everything was pre-computed during embark Phase 2.** The user's action triggers:

1. Reveal sealed drops: `traits.reveal(quest_id)` and `skills.reveal(quest_id)` flip `sealed = false` on drafts linked to this quest. Each module flips its own flags — clean boundary.
2. Set quest status to `turned_in`
3. Present the pre-written turn-in narrative, XP earned, and any drops (cross-query both modules for quest_id to build the reward display)

No LLM call. No spinner. Instant. The celebration screen appears the moment the user acts.

**For human-executed quests:** The human reports completion in conversation. The warden runs a lightweight evaluation within the same chat turn (asks what happened, captures narrative, extracts memories). XP is minimal (pure function, instant). No trait/skill drops. No separate wait — it's part of the conversation flow.

**For failures:** Same instant reveal. The failure evaluation was pre-computed in Phase 2 — failure analysis, partial XP, lessons learned. Failed quests go through turn-in identically. Potentially the richest learning source.

Dopamine peaks at anticipation, not delivery. The pre-computed-but-unrevealed rewards create the "hope loop." The turn-in IS the reveal.

### 12. Storylines — Campaigns, Plans, Execution Scaffolding

Three abstraction levels, no more. Storyline (why) → Quest (what) → Subgoal (how). Each has a distinct stability profile: storylines are stable (long-term campaigns), quests are semi-stable (scoped deliverables), subgoals are volatile (dynamic execution checkpoints managed by the warden during embark).

#### Ordering and Parallelism

Within a storyline: quests execute sequentially by `position`, top to bottom. Only the first non-terminal quest is eligible. Blocked or paused quest = blocked storyline. No exceptions. The warden can revise the plan (reorder, add, remove quests) but execution is always sequential.

Between storylines: full parallelism. Independent campaigns. Standalone quests (no storyline) are independently parallelizable.

**`position` column on quests.** `INTEGER`, nullable (standalone quests don't need it). Sparse integers with default spacing of 1000 (first quest at 1000, second at 2000, third at 3000). Insert between 1000 and 2000 → 1500. If any gap shrinks below 10, rebalance the entire storyline to even spacing — single UPDATE, rare event. The warden specifies "insert after quest X" or "move quest Y before quest Z"; the tool handles the integer math. The warden never thinks about position numbers.

**Recurring quests cannot belong to storylines.** A recurring quest is a habit, not a step in a campaign. `rrule IS NOT NULL AND storyline_id IS NOT NULL` is a constraint violation. The warden enforces this at creation time.

#### Storyline Creation

Two paths:

- **Human in conversation:** "I want to migrate to Kubernetes" → warden creates storyline with rich markdown description (the "why," approach, constraints, context) + initial quest decomposition (3–7 quests with titles and rough descriptions). All in one chat turn. The storyline is immediately populated and the first quest is ready for prowl.
- **Ghost during enrichment/consolidation:** The warden notices related board proposals or repeated themes. Instead of creating yet another standalone quest, it proposes grouping them into a storyline — in conversation ("I notice you've been working on several deploy-related things — want me to organize these into a storyline?"), not on the board. Storylines are structural decisions, not transactional proposals. The human confirms or declines.

No separate board for storylines. They're created deliberately, not autonomously.

#### Quest-to-Storyline Assignment

Part of the warden's enrichment step at acceptance. The warden knows all existing storylines. If the quest clearly relates to one, it assigns it and picks the right position (typically appended at the end). If ambiguous, it asks. If standalone, `storyline_id` stays null. Button-click acceptance (async enrichment) handles assignment automatically. No separate mechanism.

#### Storyline Description as Living Context

The description is strategic context — the "why" — fed to every quest's embark context assembly. It must be rich. The warden writes it at creation time and maintains it as a living document:

- After quest completions, the warden may update the description to reflect evolved understanding.
- If a storyline was created thin (user just said "track this project"), the warden enriches it when the first quest is accepted — same pattern as quest enrichment.
- The description survives indefinitely and is the persistent context that gives every quest in the storyline meaning across sessions and delegations.

#### Storyline Lifecycle

```
active → completed
  ↘ archived (shelved)
```

**Completion is a warden judgment, not automatic.** Rationale: "Migrate to Kubernetes" might have all current quests done but the warden realizes monitoring is missing. Auto-completion would be premature.

The mechanism: `ghostpaw quests tend` detects storylines where all quests are terminal (pure SQL, zero tokens). It flags them for warden review by creating a lightweight system session. The warden either marks the storyline `completed` (with a storyline-level summary narrative synthesized from quest narratives) or adds more quests. No storyline-level XP — quest XP already captures everything.

`archived` = shelved intentionally by the human, any time. Can be reactivated.

#### Storyline Deadline Propagation

Storylines have `due_at`. If a storyline has a deadline but its individual quests don't, the urgency must still flow down. The eligibility query (section 10) uses `COALESCE(quest.due_at, storyline.due_at)` — whichever is earlier wins. This means a storyline deadline automatically pressures its current quest in the prowl's priority ordering without manually setting `due_at` on each one.

#### The Moving Finish Line

The warden can add quests to a storyline during execution. "Quest 3 of 7" becomes "Quest 3 of 9." This risks undermining the goal-gradient effect (motivation accelerates near completion, but the finish line moved).

Mitigations:

- **Show absolute count, not ratio.** "3 quests completed" is concrete progress regardless of total. The research says concrete progress outperforms percentage — so show the count, not "33%."
- **The warden is conservative about late additions.** When a storyline is 80%+ complete, the warden should prefer creating follow-up work as a new storyline rather than extending the current one. Finishing a storyline IS the motivational payoff.
- **Transparency when additions happen.** "Quest 2 revealed 2 additional steps we need" — framed as discovery, not goalpost-moving. The human sees why.

Backed by: WoW's sequential quest chain design (narrative coherence + goal-gradient effect), goal-gradient hypothesis (motivation accelerates near completion), endowed progress effect (visible partial completion increases drive), ReCAP (plan-ahead + execute-first-refine-remainder).

### 13. Recurring Quests — Streaks and Habits

RRULE handles mechanics. The behavioral layer:

- **Streak tracking** from quest_occurrences data. Visible streaks drive commitment (60% increase per Duolingo data).
- **Streak freeze** — one grace day preserves persistence. Two consecutive misses break.
- **Short-term milestone framing** — celebrations at 7, 14, 30 days.
- **Adaptive scheduling** — the ghost learns completion patterns, adjusts reminder timing.
- **Decay detection** — first 2–3 consecutive skips are the critical signal. Gentle mention, not a howl.

No template system. Trust the souls to adapt.

### 14. Cost Transparency

XP estimation and cost estimation share the same complexity projection in `lib/xp.ts`. Stored as `estimated_cost_low` and `estimated_cost_high` on the quest record. Computed at quest creation/acceptance (pure function, instant), updated when the description changes. Shown before embark: "~150–300 XP, roughly $2–6."

Ranges, not point estimates. High-variance honest ranges build trust. Narrow dishonest ones erode it. If remaining daily budget is below the high estimate, warn. Never prevent — the human decides.

**Self-calibrating estimates.** After execution, actual cost = `SUM(cost_usd) FROM sessions WHERE quest_id = ?`. Every turned-in quest produces an actual/estimated ratio. A pure SQL aggregate by complexity tier gives a `calibrationFactor` — the historical accuracy of estimates for quests of similar size. `estimateQuestCost()` takes this factor as input, tightening its ranges as data accumulates. Early estimates are wide (low confidence). After 20+ turned-in quests, the calibration factor converges and estimates get narrow and honest. No LLM needed, no separate process — the data accumulates naturally from turn-ins, and the SQL aggregate is computed at estimation time. One query.

### 15. The Automation Paradox — Awareness, Not Resistance

The paradox is real: delegation makes the ghost smarter while the human's hands-on competence in the delegated domain decays. Measured: Copilot reduces security awareness 12–20%. But the design choice is clear — **maximize LLM leverage**. The ghost's purpose is to do the work. Humans who want to learn can learn; the system doesn't force education on people who just want things done.

The mitigation is not to limit delegation but to ensure all the data for learning is always there:

1. **Turn-in narratives explain "what I did and why."** Every completed quest produces a human-readable narrative of the approach, decisions, and reasoning. The human reads this at reveal time if they're curious. It's effortless because the narrative is pre-computed and well-written.
2. **Journal entries synthesize daily activity.** The historian soul produces narrative records that capture the big picture. Reading the journal is optional but always educational. Three months of journal entries tell the story of what the ghost learned.
3. **Transparent blocked states teach on demand.** When the ghost blocks, it explains clearly: "X failed because Y, which happens when Z, options are A and B, here's what each means." The human learns exactly what they need to unblock. This is learning at the moment of need — the most effective kind.
4. **Adaptive delegation offers.** Track delegation patterns per archetype. If the human always says "I'll do it" for a quest type, the ghost respects that. If the human always delegates, no problem — that's the system working as designed. The ghost adapts to the individual's preferences without judgment.
5. **"Why did you do X?" is always answerable.** Session data, tool call history, warden validation logs — the full execution trajectory is preserved. Any human question about past ghost work can be answered in detail. Comprehension is available on demand, never forced.

**Design principle:** The ghost maximizes leverage. The data for understanding is always there. Humans learn when they want to, not when the system thinks they should.

### 16. Gamification Integrity

**XP is a legibility metric, not a mechanism.** It answers "how much has the ghost worked and learned?" in a single mathematically grounded number. It enables comparisons ("this quest earned 3x more than that one"), estimation ("similar quests yield ~200 XP"), and delegation incentives ("I embark: ~120 XP vs you do it: ~15 XP"). XP does not trigger any mechanism — it doesn't unlock features, gate capabilities, or drive evolution directly. The actual ghost improvement happens through the soul and skill pipelines, which consume sessions and trait/skill drafts. XP correlates with improvement but doesn't cause it. This is intentional: tying improvement to a number would create perverse incentives (gaming the formula). Tying it to actual session content (evaluated by souls) keeps improvement genuine.

The system uses genuine gamification (SDT: autonomy, mastery, purpose), not pointsification:

- XP is a natural byproduct of every session, never the reason to act. Storyline progression is the primary reward.
- Trait/skill drops are rare surprises, not expected. Quality over quantity.
- The ghost never frames tasks as "do this for XP."
- XP being universal (all sessions, not just quests) prevents it from feeling like a quest-specific grind. Quest bonus XP is real but earned through novelty and structured work, not artificial inflation.
- If the user forces pointless sessions to farm XP — that's fine. They see the dollar cost next to it, and the sessions ARE raw materials for soul evolution regardless. Novelty pricing self-corrects: repetitive content in a familiar domain yields diminishing XP through the novelty multiplier.
- If it ever feels like a points treadmill, the design has failed.

Overjustification Effect is real — external rewards on intrinsically motivated activities can reduce motivation. The defense: rewards emerge from the work, they don't drive it. XP accrues silently on every session. The user sees totals when they care to look.

### 17. Progress Visualization

Two simultaneous goal-gradient effects:

- **Macro:** "3 quests completed in [Storyline Name], 4 remaining" — storyline-level progress. Show absolute counts, not percentages. Concrete progress (3 done) outperforms vague (43%). If the warden adds quests mid-storyline, the "completed" count is solid momentum that doesn't regress.
- **Micro:** "3/5 subgoals complete" — quest-level progress. Subgoals checking off during execution IS the progress bar.

Visible progress bars increase completion probability (LinkedIn: 20% → 55%). All progress data is pre-computed and stored — display is always instant.

### 18. Distributed Drops — No Inventory Subsystem

Quest drops go directly to the domain modules that own them. No intermediate inventory system. The routing is always 1:1 — there is no N×N exchange problem:

- **Trait observations** → `traits.stash_draft()` → mentor's `trait_drafts` table
- **Skill patterns** → `skills.stash_draft()` → trainer's `skill_drafts` table
- **Domain insights** → warden writes memories directly (no staging needed)

#### Schemas

**`trait_drafts`** — owned by the traits module:

```sql
trait_drafts (
  id          INTEGER PRIMARY KEY,
  quest_id    INTEGER REFERENCES quests(id),  -- attribution: which quest produced this
  soul_id     INTEGER REFERENCES souls(id),   -- which soul is this observation about
  title       TEXT NOT NULL,                   -- the observed behavioral pattern
  evidence    TEXT NOT NULL,                   -- specific evidence from the quest execution
  sealed      INTEGER NOT NULL DEFAULT 1,      -- 1 = hidden until quest turn-in
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK(status IN ('open', 'consumed', 'merged', 'discarded')),
  merged_into INTEGER REFERENCES trait_drafts(id),  -- if merged, points to the resulting draft
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
)
```

**`skill_drafts`** — owned by the skills module:

```sql
skill_drafts (
  id          INTEGER PRIMARY KEY,
  quest_id    INTEGER REFERENCES quests(id),  -- attribution: which quest produced this
  title       TEXT NOT NULL,                   -- the observed procedural pattern
  content     TEXT NOT NULL,                   -- description of the pattern and how it was used
  sealed      INTEGER NOT NULL DEFAULT 1,      -- 1 = hidden until quest turn-in
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK(status IN ('open', 'consumed', 'merged', 'discarded')),
  merged_into INTEGER REFERENCES skill_drafts(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
)
```

#### Module APIs

Each module exposes controlled functions for external writes — the only paths in:

- `traits.stash_draft(quest_id, soul_id, title, evidence)` → creates a sealed trait draft
- `traits.reveal(quest_id)` → flips `sealed = false` on all drafts for this quest
- `traits.cleanup(quest_id)` → deletes sealed drafts for failed/abandoned quests
- `skills.stash_draft(quest_id, title, content)` → creates a sealed skill draft
- `skills.reveal(quest_id)` → flips `sealed = false` on all drafts for this quest
- `skills.cleanup(quest_id)` → deletes sealed drafts for failed/abandoned quests

Mentor/trainer tools handle all internal operations (fusion, consumption, discarding).

#### The Sealed Mechanic

Drafts written during embark Phase 2 have `sealed = true` — invisible to mentor/trainer until the quest turn-in calls `reveal(quest_id)`. The loot bag surprise is preserved: the user sees what dropped at turn-in time, not before.

**Cleanup rules:**

- **Failed quests** → drafts are NOT cleaned up. Phase 2 ran, the failure was evaluated, drops were identified. Failed quests go through turn-in identically to successful ones — potentially the richest learning source.
- **Abandoned quests** (never reached `active`, Phase 2 never ran) → no sealed drafts exist, nothing to clean up.
- **Phase 2 crash recovery** → if a process crashes mid-Phase 2 (partial drafts stashed), the next embark attempt runs `cleanup(quest_id)` as the FIRST step of Phase 2, clearing any orphaned sealed drafts before re-evaluating fresh. This is the only case where cleanup fires — as a clean-slate guard, not a discard mechanism.

**The loot bag view.** Cross-module read query at display time: "show all trait_drafts and skill_drafts WHERE quest_id = X." Each module exposes a read function for this. The UI builds the reward screen from both tables, attributed to the quest.

#### Soul Interaction Modes

Each domain soul gains a third interaction mode alongside the existing two:

1. **Session mining** — reads recent sessions, extracts patterns. Existing mode for both mentor and trainer.
2. **Human guidance** — follows explicit direction in conversation. Existing mode for both.
3. **Draft scouring** — reads unsealed drafts in its domain. Three possible actions per draft:
   - **Consume** — the draft is strong enough to act on directly (mentor: propose as real trait via `propose_trait`; trainer: create actual skill file).
   - **Fuse** — merge multiple weak drafts into a stronger one. Input drafts get `status = 'merged'` with `merged_into` pointing to the result. The fused draft is richer because it captures the pattern across contexts. Every merge is unique from its inputs.
   - **Pass** — not enough evidence yet. Leave it for later — more drafts may arrive from future quests.

The mentor understands trait semantics. The trainer understands skill structure. Domain-native fusion is naturally higher quality than a generic inventory system could provide.

#### Propagation Tasks

This distributed drops design needs to be documented in the target domain docs when those are updated:

- **SOULS.md** — add `trait_drafts` table, sealed mechanic, the third "draft scouring" mode for the mentor, fusion mechanics, and the `stash_draft/reveal/cleanup` API. Add new mentor tools for draft operations (list, fuse, consume, discard).
- **Skills documentation** — add `skill_drafts` table, sealed mechanic, the third "draft scouring" mode for the trainer, fusion mechanics, and the `stash_draft/reveal/cleanup` API. Add new trainer tools for draft operations.
- **Both docs** — link back to QUESTS.md for the quest turn-in flow that produces these drafts.

### 19. The Journal — Narrative Layer and Continuity

Separate feature system (`JOURNAL.md`). A dedicated historian soul writes terse, evocative field reports of daily operations. Reads from quests, sessions, memories, pack, souls. Read-only for other systems. The raw session XP data across the day provides a natural activity signal for what's worth narrating.

**The journal soul owns narrative continuity across quests.** Per-quest turn-in narratives are snapshots written at completion time — they capture what happened within that quest. But temporal relationships between quests (concurrent completions, cascading discoveries, storyline momentum shifts) can only be seen from a higher vantage point. The journal soul, running during night hours or at end of day, sees the full picture: all quests turned in today, all sessions across all storylines, all new memories, all trait/skill drafts dropped. It writes the synthesis that connects the dots. The per-quest narrative is the celebration moment. The journal entry is the historian's account.

Backed by: Pennebaker's expressive writing (well-being, memory, goal clarity), life-logging (episodic memory improvement), narrative identity (coherent life stories increase resilience).

### 20. Schema Extensions

**Sessions table — two new columns:**

```sql
xp        INTEGER NOT NULL DEFAULT 0    -- computed at session close by calculateSessionXP()
quest_id  INTEGER REFERENCES quests(id) -- nullable, links quest execution sessions
```

`xp` is computed once, stored forever. Same formula as every other session. `quest_id` enables trajectory reconstruction for turn-in evaluation via simple `WHERE quest_id = ?` queries. Both columns have indexes for efficient aggregation.

**Quest session exclusion from regular distillation.** Sessions with `quest_id IS NOT NULL` are owned by the quest pipeline — the embark Phase 2 evaluates them holistically with full quest trajectory and storyline context, producing higher-quality memory extractions than generic distillation ever could. Regular distillation (the warden's scheduled session processing) must skip these sessions to prevent double-harvesting:

```sql
-- Distillation query: exclude quest-owned sessions
WHERE quest_id IS NULL
   OR quest_id IN (SELECT id FROM quests WHERE status = 'abandoned')
```

- **Active/paused/blocked** quest sessions → skip. Phase 2 will process them when the quest completes.
- **Done/turned_in/failed** quest sessions → skip. Phase 2 already processed them with richer context.
- **Abandoned** quest sessions → include. Phase 2 never ran and never will. These sessions contain value that only regular distillation can extract.

This rule must be enforced in the distillation query (MEMORY.md / ORCHESTRATION.md — update when implementing). The warden's consolidation and maintenance routines respect the same boundary.

**Quests table — new columns:**

```sql
position             INTEGER             -- ordering within storyline, sparse (1000, 2000, ...), nullable for standalone
checkpoint_summary   TEXT                -- concise record of last validated step, updated during Phase 1, read on continuation
estimated_cost_low   REAL                -- pre-embark cost estimate, lower bound
estimated_cost_high  REAL                -- pre-embark cost estimate, upper bound
estimated_xp_low     INTEGER             -- pre-embark XP estimate, lower bound
estimated_xp_high    INTEGER             -- pre-embark XP estimate, upper bound
quest_xp             INTEGER             -- final XP from calculateQuestXP(), set in Phase 3
actual_cost          REAL                -- SUM(cost_usd) from linked sessions, set in Phase 3
```

`position` enables strict storyline ordering. `checkpoint_summary` enables cheap pause/resume without replaying session history. Estimate columns store pre-computed ranges for zero-wait display. Final columns store post-embark actuals for calibration.

**New table: `quest_subgoals`** — dynamic execution checkpoints managed by the warden during embark:

```sql
CREATE TABLE quest_subgoals (
  id         INTEGER PRIMARY KEY,
  quest_id   INTEGER NOT NULL REFERENCES quests(id),
  text       TEXT NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  position   INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at    TEXT
);
CREATE INDEX idx_quest_subgoals_quest ON quest_subgoals(quest_id);
```

Volatile by design — the warden adds, removes, reorders, and checks off subgoals during Phase 1. Simple quests may have zero subgoals (binary completion). Complex quests may have 5–15 that evolve as understanding deepens. `position` uses the same sparse-integer pattern as storyline ordering. `subgoalCount` for `calculateQuestXP()` = `COUNT(*) WHERE quest_id = ? AND done = 1`.

**No `quest_rewards` table.** Drops go directly to domain modules during embark Phase 2. Trait drafts are stashed (sealed) in the traits module's `trait_drafts` table. Skill drafts are stashed (sealed) in the skills module's `skill_drafts` table. Domain insights are written as memories directly. Each draft has a `quest_id` for attribution — the loot bag display is a cross-query at turn-in time. See section 18 ("Distributed Drops") for the `trait_drafts` and `skill_drafts` table schemas, module APIs, sealed mechanic, and propagation tasks to SOULS.md and skills documentation.

**Rename `quest_log_id` → `storyline_id`** on quests table. Rename `quest_logs` table → `storylines`. Rename all tool names, CLI subcommands, and type references accordingly.

**Status CHECK constraint update:**

```sql
CHECK(status IN ('offered','accepted','active','paused','blocked','done','turned_in','failed','abandoned'))
```

Nine states. `pending` → `accepted`, `cancelled` → `abandoned`. Added: `paused`, `turned_in`.
