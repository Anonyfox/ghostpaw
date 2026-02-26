# Config

Ghostpaw manages configuration as rows in its SQLite database — not a JSON file, not environment variables, not YAML at three scopes. Every setting is a flat key with a typed primitive value. Every change is atomic, attributed to its source, and preserved in a per-key changelog. The agent reads and writes config through the same tool interface it uses for everything else, which means the system can tune itself over time — globally, permanently, with full accountability.

## One Store

Most agent frameworks scatter config across multiple sources. OpenClaw resolves from five in a precedence chain: shell environment, JSON config block, global `.env`, local `.env`, process environment. Aider adds YAML files at three scopes. The result is config sprawl — to know the effective value of a setting, you trace the chain across files and formats, hoping nothing shadows something else.

Ghostpaw has one source: the `config` table in `ghostpaw.db`. System settings, user preferences, skill parameters, agent-generated state — one table, one backup, one truth. No `.env` files. No precedence chain to debug. No second artifact to forget when moving to a new machine.

## Agent-Legible Format

Values are `string`, `integer`, `number`, or `boolean`. No nested JSON. No YAML structures. No arrays.

This is a constraint that pays off. An LLM can reason about `temperature = 0.7` or `cost_limit_daily_usd = 5.0` — flat key, simple value, obvious meaning. It cannot reliably parse or produce nested configuration structures without risking corruption. The flat-key primitive-value format makes every setting safe for the agent to read through a tool call and safe to write back. System keys enforce type and constraint validation on write; custom keys infer type from the value.

## Changelog, Attribution, Undo

Every config write creates a new entry linked to its predecessor in a per-key chain. Nothing is overwritten. The full history of every setting is preserved: what it was, when it changed, who changed it.

Source tracking records origin on every entry: `cli`, `web`, `agent`, `env`, or `import`. When costs spike after an overnight cron job, the audit trail shows exactly which agent changed `cost_limit_daily_usd` at 3 AM — not the user, not an import script.

Undo walks the chain backward, one step per key. Reset deletes the chain entirely, returning to the code default. No guessing what a value used to be. No manual revert from memory.

Research on multi-agent shared state identifies this kind of immutable provenance — who wrote what, when, through which channel — as a [key design requirement](https://arxiv.org/abs/2505.18279) for auditable concurrent systems.

## Safe Under Concurrency

Ghostpaw is not one agent, one session. The main agent delegates to specialists, cron jobs fire on schedules, the user chats via Telegram while a background task runs. Multiple sessions share the same database.

Every config write runs inside a SQLite transaction. WAL mode ensures reads never block writes. Concurrent sessions cannot produce partial state or clobbered values. There is no file-level race condition because there is no file.

This matters because LLM agents are bad at coordinating shared resources on their own — [DPBench](https://arxiv.org/abs/2602.13255) finds deadlock rates exceeding 95% when agents compete for shared state without an external coordination mechanism. The transaction layer is that mechanism: invisible to the agents, always correct.

## The Agent Tunes the System

Research consistently shows that agents which adjust their own operational parameters outperform statically configured ones. [ToolSelf](https://arxiv.org/abs/2602.07883) abstracts config updates as a tool call and measures 24.1% average gains from mid-run self-reconfiguration. [SelfBudgeter](https://arxiv.org/abs/2505.11274) lets agents set their own token budgets, cutting costs 61%. [PROTEUS](https://arxiv.org/abs/2601.19402) learns cost-escalation thresholds at runtime, saving 89.8%.

Those systems tune ephemeral per-run parameters that vanish when the session ends. Ghostpaw goes further: config changes are **global and permanent**. When the agent determines that `temperature = 0.5` works better for this workspace, or that `max_tokens_per_session = 30000` is the right ceiling, it writes that value once. Every future session, every sub-agent, every cron job inherits the change. The improvement persists. Day 1's tuning is still active on day 100.

This is system-level learning through configuration — not a session-local tweak that vanishes, not a memory the agent might or might not recall. A persistent, typed, attributed value that governs how the entire system operates. And the safety net is the changelog: every agent-made change is visible, attributed, and reversible with a single undo.

## Managing Config

### Terminal

```bash
ghostpaw config set temperature 0.7           # type inferred as number
ghostpaw config set default_model claude-sonnet-4-20250514
ghostpaw config get cost_limit_daily_usd       # returns typed value
ghostpaw config list                           # all settings, grouped by category
ghostpaw config undo temperature               # restore previous value
ghostpaw config reset temperature              # return to code default
```

Constraint validation for system keys. Scripting-friendly output when piped.

### Web UI

The Settings page shows all configuration organized by category with inline editing, undo, and reset. A dedicated model selector with live provider discovery sits above the config tabs — switching models is a single click, not a key to remember.

### Agent Tools

The agent reads and modifies config through its tool surface. Values are fully visible to the model (unlike secrets). Source is tracked as `agent`. The user can inspect, undo, or override any change the agent made from any channel.

## System Keys

Ghostpaw ships with a growing set of known system keys, each with a type, default, and validation constraints defined in code. No database seeding required — if no override exists, the code default applies.

**Model** — which LLM to use. The web UI's model selector shows available models from each configured provider with live discovery.

**Cost** — spend controls. Token limits per session and per day. A warning threshold. A hard USD cap per rolling 24-hour period. All validated on write.

New system keys are added as features grow. The definitions live in code and are always authoritative.

## Custom Keys

Any key not in the system list is a custom key. Type is inferred from the value. No restrictions on names or values beyond type correctness.

Custom keys are how skills and agents persist operational preferences: a code-review skill storing `review.style = thorough`, a deployment agent tracking `deploy.target = staging`, the agent itself recording `preferred_search_provider = brave`. They live alongside system keys with the same history, attribution, and undo. The difference is purely semantic — system keys have code-defined defaults and constraints; custom keys are freeform.

## Design Decisions

**No in-memory cache.** Every read goes through SQLite. Small table, indexed queries, WAL mode. Every session sees the latest committed value with zero invalidation logic — essential when concurrent sessions modify config.

**Linked list history.** Forward chain rather than versioned rows. Current value: `WHERE next_id IS NULL`. Undo: pointer swap. Reset: bulk delete. No compaction, no version numbering.

**Defaults in code, not the database.** A row means an explicit override. No row means the code default. Upgrades that change defaults require zero migration.
