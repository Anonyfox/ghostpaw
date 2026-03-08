# Config

Most agent frameworks scatter configuration across multiple sources. OpenClaw resolves from five in a precedence chain: shell environment, JSON config block, global `.env`, local `.env`, process environment. Aider adds YAML files at three scopes. To know the effective value of a setting, you trace the chain across files and formats, hoping nothing shadows something else. And when an agent modifies a config file directly — writing JSON, editing YAML — it introduces syntax errors, clobbers comments, and creates merge conflicts. Configuration as a file format is a liability when the writer is an LLM.

Ghostpaw treats configuration as structured state in the database. One table. Every change atomic, attributed, and reversible. The agent reads and writes config through the same tool interface it uses for everything else — flat keys and typed primitive values that an LLM can reason about without risking corruption. The system can tune itself over time, and every adjustment is auditable, undoable, and permanent.

## One Truth

Every setting lives in the `config` table in `ghostpaw.db`. System settings, user preferences, skill parameters, agent-generated state — one table, one backup, one truth. No `.env` files. No precedence chain to debug. No second artifact to forget when moving to a new machine.

Values are `string`, `integer`, `number`, or `boolean`. No nested JSON. No YAML structures. No arrays. This is a constraint that pays off. An LLM can reason about `temperature = 0.7` or `cost_limit_daily_usd = 5.0` — flat key, simple value, obvious meaning. It cannot reliably parse or produce nested configuration structures without risking corruption. The flat-key primitive-value format makes every setting safe for the agent to read through a tool call and safe to write back. System keys enforce type and constraint validation on write; custom keys infer type from the value.

## Every Change Has a Story

Every config write creates a new entry linked to its predecessor in a per-key chain. Nothing is overwritten. The full history of every setting is preserved: what it was, when it changed, who changed it.

Source tracking records origin on every entry: `cli`, `web`, `agent`, `env`, or `import`. When costs spike after an overnight scheduled run, the audit trail shows exactly which agent changed `cost_limit_daily_usd` at 3 AM — not the user, not an import script. When a model switch degrades quality, the changelog shows when `default_model` changed, from what, and through which channel.

Undo walks the chain backward, one step per key. Reset deletes the chain entirely, returning to the code default. No guessing what a value used to be. No manual revert from memory.

Research on multi-agent shared state identifies this kind of immutable provenance — who wrote what, when, through which channel — as a [key design requirement](https://arxiv.org/abs/2505.18279) for auditable concurrent systems.

## The Agent Tunes the System

Research consistently shows that agents which adjust their own operational parameters outperform statically configured ones:

- **Mid-run self-reconfiguration yields +24.1% average performance gains** across diverse benchmarks. Abstracting config updates as a tool call — exactly what Ghostpaw does — lets agents adapt their own execution parameters at runtime. ([ToolSelf](https://arxiv.org/abs/2602.07883), Feb 2026)

- **Agent-managed token budgets cut costs by 61%** compared to fixed allocations. Self-awareness of resource constraints, available as a readable config value, enables efficient resource use without external monitoring. ([SelfBudgeter](https://arxiv.org/abs/2505.11274), May 2025)

- **Learned cost-escalation thresholds save 89.8%** versus fixed model selection. Starting cheap and escalating only when needed — governed by a config-managed threshold — is dramatically more efficient than always using the most capable model. ([PROTEUS](https://arxiv.org/abs/2601.19402), Jan 2026)

- **Multi-agent deadlock rates exceed 95%** when agents compete for shared state without external coordination. SQLite transactions provide that coordination: invisible to the agents, always correct. ([DPBench](https://arxiv.org/abs/2602.13255), Feb 2026)

Those research systems tune ephemeral per-run parameters that vanish when the session ends. Ghostpaw goes further: config changes are **global and permanent**. When the agent determines that `temperature = 0.5` works better for this workspace, or that `compaction_threshold = 150000` is the right ceiling for this project's context needs, it writes that value once. Every future session, every sub-agent, every scheduled job inherits the change. The improvement persists. Day 1's tuning is still active on day 100.

Config mutations go through the [chamberlain](SOULS.md#persistence-and-infrastructure-souls) — a dedicated infrastructure soul that governs config, secrets, budget, and scheduling. The chamberlain validates mutations against known constraints before applying them, and the coordinator can undo or override any agent-made change from any channel. This is system-level learning through configuration — not a session-local tweak that vanishes, not a memory the agent might or might not recall. A persistent, typed, attributed value that governs how the entire system operates, with a complete audit trail and one-step undo as the safety net.

## System Keys and Custom Keys

Ghostpaw ships with a growing set of known system keys, each with a type, default, and validation constraints defined in code. No database seeding required — if no override exists, the code default applies. System keys cover model selection, cost controls, and global behavioral parameters. Each feature documents its own config keys — see [Souls](SOULS.md#configuration), [Memory](../MEMORY.md#configuration), and [Howl](../HOWL.md#rate-limiting) for feature-specific tuning options.

Any key not in the system list is a custom key. Type is inferred from the value. No restrictions on names or values beyond type correctness. Custom keys are how skills and agents persist operational preferences: a code-review skill storing `review.style = thorough`, a deployment agent tracking `deploy.target = staging`, the agent itself recording `preferred_search_provider = brave`. They live alongside system keys with the same history, attribution, and undo. The only difference is semantic — system keys have code-defined defaults and constraints; custom keys are freeform.

## Managing Config

### Terminal

```bash
ghostpaw config set temperature 0.7           # type inferred as number
ghostpaw config set default_model claude-sonnet-4-20250514
ghostpaw config get cost_limit_daily_usd       # returns typed value with metadata
ghostpaw config list                           # all settings, grouped by category
ghostpaw config undo temperature               # restore previous value
ghostpaw config reset temperature              # return to code default
```

Constraint validation for system keys. Scripting-friendly output when piped.

### Web UI

The Settings page shows all configuration organized by category with inline editing, undo, and reset. A dedicated model selector with live provider discovery sits above the config tabs — switching models is a single click, not a key to remember. Every change shows its source and previous value.

### Agent Tools

The agent reads and modifies config through the [chamberlain's](SOULS.md#persistence-and-infrastructure-souls) tool surface — `get_config`, `list_config`, `set_config`, `undo_config`, `reset_config`. Values are fully visible to the model (unlike secrets). Source is tracked as `agent`. The user can inspect, undo, or override any change the agent made from any channel.

## Design Decisions

**No in-memory cache.** Every read goes through SQLite. Small table, indexed queries, WAL mode. Every session sees the latest committed value with zero invalidation logic — essential when concurrent sessions modify config.

**Linked-list history.** Forward chain rather than versioned rows. Current value: `WHERE next_id IS NULL`. Undo: pointer swap. Reset: bulk delete. No compaction, no version numbering. The chain is the source of truth.

**Defaults in code, not the database.** A row means an explicit override. No row means the code default. Upgrades that change defaults require zero migration — the new default applies automatically unless the user has explicitly overridden it.

**Flat keys, not namespaces.** `memory_half_life_days`, not `memory.half_life_days` or `memory: { halfLifeDays }`. A flat key is greppable, unambiguous, and safe for an LLM to produce. Categories group keys for display but do not affect the key format.

## Why This Matters

Configuration might seem like plumbing. In a static tool, it is. But in an agent that runs autonomously — delegating to specialists, executing scheduled jobs, tuning its own parameters over time — configuration is the control surface for the system's behavior. Every operational parameter that the agent can read and write is a degree of freedom for self-improvement. Every change that persists globally is a lesson that compounds.

The changelog makes this safe. An agent that can change `compaction_threshold` from 200K to 150K and have that change persist across every future session has genuine system-level agency. But the user can see exactly when it happened, through which soul, and undo it with a single command. The power and the safety net are the same mechanism — attributed, versioned, reversible state.

The alternative — static config files that only the user edits — means the agent cannot learn operational preferences. It cannot adapt its own resource usage. It cannot tune parameters based on what works for this specific workspace, this specific human, these specific tasks. The research measures what that costs: +24% from self-reconfiguration, -61% from self-budgeting, -89.8% from learned escalation. These are gains that a statically configured agent structurally cannot capture.

Ghostpaw captures them. One table, one truth, every change accountable.
