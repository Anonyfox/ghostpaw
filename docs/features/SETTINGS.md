# Settings

Three operational systems ghostpaw governs for itself: **credentials**, **configuration**, and **scheduling**. All managed by the [chamberlain](SOULS.md#persistence-and-infrastructure-souls) — a dedicated infrastructure soul structurally isolated from the coordinator. The coordinator, which holds conversations and is the primary prompt injection surface, has zero access to secret operations, config mutations, or schedule management. The tools don't exist in its context — not a policy the model can be instructed to bypass.

Secrets protect credentials through five defense layers — the [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) ranks Prompt Injection #1 and Sensitive Information Disclosure #2, and Ghostpaw addresses both structurally. Configuration persists every operational parameter in a single table with full attribution and undo — agents that self-tune gain [+24% performance](https://arxiv.org/abs/2602.07883), [-61% cost](https://arxiv.org/abs/2505.11274), and [-89.8% model waste](https://arxiv.org/abs/2601.19402). Scheduling gives ghostpaw [temporal autonomy](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents) — crash-safe job execution with at-most-once guarantees, so it wakes itself, consolidates memory, and maintains relationships without being prompted. Together these form the operational foundation that makes everything else — souls, memory, pack, haunting — possible.

## Secrets

AI agents with shell access create a security problem no existing tool solves. The agent runs `echo $ANTHROPIC_API_KEY` and the value transits through the provider's API as conversation payload — now in a third party's logs. [CVE-2026-21852](https://github.com/advisories/GHSA-jh7p-qr78-84p7) demonstrated this in Claude Code: malicious repositories exfiltrated API keys before users confirmed trust. Claude Code also [auto-loads `.env` files](https://www.knostic.ai/blog/claude-loads-secrets-without-permission) containing credentials without notification. Beyond leakage: keys get lost when terminals close, scattered across `.env` / `.bashrc` / `.zshenv`, and the agent can't validate what you paste. Every major open-source agent tool — Claude Code, Aider, Open Interpreter — shares this gap. Ghostpaw treats it as an engineering problem with a specific solution: defense in depth.

### Defense in Depth

Five independent layers. Each catches what the others miss. An attacker must defeat all five simultaneously.

**Structural Isolation** — The coordinator has zero access to secret operations — the tools don't exist in its context. Secrets are managed exclusively by the chamberlain in an ephemeral, isolated session with no filesystem tools, no web tools, and no delegation capabilities. This is the [least-privilege principle](https://appropri8.com/blog/2026/01/21/least-privilege-mcp-agents/) enforced architecturally — per-soul tool scoping below what any single agent could access, applied as [guardrailed tool execution](https://medium.com/@rameshrajach/guardrailed-tool-execution-defense-in-depth-for-agentic-ai-d4d83e104672) that [research confirms](https://pub.towardsai.net/securing-agentic-ai-systems-a-defense-in-depth-approach-98bffb1ae6c7) is significantly more effective than prompt-layer defenses. The [OWASP Top 10](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) ranks Prompt Injection #1, Sensitive Information Disclosure #2, and Excessive Agency #6 — structural isolation addresses all three. [MCP-based attacks exfiltrate tool responses](https://openreview.net/forum?id=UVgbFuXPaO) across frontier models while preserving task quality; even [monitoring-based defenses can be bypassed](https://arxiv.org/abs/2602.05066) via proxy attacks against monitors themselves. Tool surface isolation prevents both classes entirely — the operation doesn't exist, so no injection, monitoring bypass, or MCP attack vector applies.

**No Retrieval Surface** — No tool, endpoint, or command returns a secret's value to the model. The operation doesn't exist. The agent references keys by environment variable name; values resolve at the point of use. The conversation only ever contains the name — eliminating credential sprawl because the agent can't hardcode a value it never has.

**Output Scrubbing** — Shell stdout/stderr containing stored secret values is replaced with `***` before the model sees it. Catches `env`, `printenv`, misconfigured scripts. Any value of 8+ characters is matched. This is a safety net, not the primary defense: [implicit prompt injection achieves 89% exfiltration success](https://arxiv.org/abs/2602.22450) with 95% evading output-based checks alone — precisely why scrubbing is layer 3, not layer 1.

**Input Cleaning** — Strips whitespace, quotes, assignment syntax (`export KEY="value"` becomes `value`). Cross-checks key prefixes — an Anthropic key pasted into the OpenAI slot produces a clear warning. Prevents silent misconfiguration that causes hours of debugging.

**Protected Keys** — Internal keys (`WEB_UI_` prefix) are blocked from agent tool modification. Enforced at both the tool layer and the API layer — a defense that doesn't depend on the model's cooperation.

### Persistent Store

Every secret lives in a single SQLite table. Set a key from any channel — it persists across restarts with exactly one canonical copy. At startup, secrets load into `process.env`; keys set outside Ghostpaw (shell exports, Docker, CI) are picked up and persisted automatically. Provider aliases resolve transparently — `ANTHROPIC_API_KEY` and `API_KEY_ANTHROPIC` point to the same entry. No `.env` files to manage, no keys lost when terminals close, no duplicates.

### Managing Secrets

```bash
ghostpaw secrets set ANTHROPIC_API_KEY    # interactive masked input
ghostpaw secrets list                      # see what's configured
ghostpaw secrets delete TAVILY_API_KEY     # remove a key
```

Keys can also be piped from password managers or automation scripts. The **web UI** Settings page shows secrets organized by category with set/update/remove — password-protected, localhost by default. In **chat**, the agent delegates to the chamberlain: listing names and status only, storing or removing keys on request. For sensitive credentials, CLI and web UI are recommended — those never send values to external services.

### Comparison

| Capability | Ghostpaw | Claude Code | Aider | Open Interpreter |
|-----------|----------|------------|-------|-----------------|
| Persistent credential store | Yes | No | No | No |
| Output scrubbing | Yes | No | No | No |
| Agent-aware key management | Yes | No | No | No |
| Per-soul tool isolation | Yes | N/A | N/A | N/A |
| Input validation & cleaning | Yes | No | No | No |
| Alias resolution | Yes | No | No | No |
| Secret-free conversation context | Yes | No | No | No |

These tools give a model shell access and hope the user manages credentials correctly. Claude Code's [CVE-2026-21852](https://github.com/advisories/GHSA-jh7p-qr78-84p7) is the documented proof that this gap has real consequences.

### Threat Model

**Protected against:** accidental leakage (`echo $KEY`, `env`, `printenv`) via output scrubbing + structural isolation. Key loss via persistent store. Key sprawl via no retrieval surface. Prompt injection targeting credentials via structural isolation — the coordinator has no secret tools. Wrong-key errors via input cleaning and prefix validation.

**Not protected against:** a fundamentally compromised model with adversarial intent AND creative evasion (alignment problem, not tooling). Database encryption at rest (unencrypted — if an attacker reads the file, they own the machine). Compromised host infrastructure (requires HSMs, vault services — out of scope for a developer tool).

The design makes the default path secure and requires deliberate adversarial effort to break.

### Supported Keys

**LLM Providers** — Anthropic, OpenAI, xAI. Multiple keys coexist; both naming conventions resolve to the same entry. **Search Providers** — Brave Search, Tavily, Serper. Priority cascade selects the highest-priority configured provider automatically. **Telegram** — `TELEGRAM_BOT_TOKEN` for the channel adapter. **Custom** — any key-value pair. Database tokens, webhook URLs, third-party API keys. Same protections, loaded into the environment alongside built-in keys.

## Configuration

Most agent frameworks scatter configuration across multiple sources. OpenClaw resolves from five in a precedence chain: shell environment, JSON config block, global `.env`, local `.env`, process environment. Aider adds YAML at three scopes. To know a setting's effective value, trace the chain across files and formats. When an LLM writes config directly — JSON, YAML — it introduces syntax errors, clobbers comments, creates merge conflicts. Configuration as a file format is a liability when the writer is an LLM.

Ghostpaw: one SQLite table, every change atomic, attributed, reversible. The agent reads and writes config through the same tool interface it uses for everything else — flat keys and typed primitive values an LLM can reason about without risking corruption.

### One Truth

Every setting lives in the `config` table. System settings, user preferences, skill parameters, agent-generated state — one table, one backup, one truth. Values are `string`, `integer`, `number`, or `boolean`. No nested JSON, no YAML, no arrays. An LLM can reason about `temperature = 0.7` and `cost_limit_daily_usd = 5.0` — flat key, simple value, obvious meaning. The flat format makes every setting safe for the agent to read and write back. System keys enforce type and constraint validation; custom keys infer type from the value.

### History and Attribution

Every write creates a new entry linked to its predecessor in a per-key chain. Nothing is overwritten. Source tracking records origin: `cli`, `web`, `agent`, `env`, or `import`. When costs spike after an overnight run, the trail shows exactly which soul changed `cost_limit_daily_usd` at 3 AM. Undo walks the chain backward, one step per key. Reset deletes the chain, returning to the code default. Research on multi-agent shared state identifies this immutable provenance as a [key design requirement](https://arxiv.org/abs/2505.18279) for auditable concurrent systems.

### Self-Tuning

Agents that adjust their own operational parameters consistently outperform static configurations:

- **+24.1% average performance** from mid-run self-reconfiguration. Abstracting config as a tool call — exactly what Ghostpaw does — lets agents adapt at runtime. ([ToolSelf](https://arxiv.org/abs/2602.07883), Feb 2026)
- **-61% token cost** from agent-managed budgets vs fixed allocations. Self-awareness of resource constraints enables efficient use without external monitoring. ([SelfBudgeter](https://arxiv.org/abs/2505.11274), May 2025)
- **-89.8% model waste** from learned cost-escalation thresholds. Start cheap, escalate only when needed — governed by a config-managed threshold. ([PROTEUS](https://arxiv.org/abs/2601.19402), Jan 2026)
- **95% deadlock rate** when agents compete for shared state without coordination. SQLite transactions provide that coordination invisibly. ([DPBench](https://arxiv.org/abs/2602.13255), Feb 2026)

Those systems tune ephemeral per-run parameters. Ghostpaw goes further: config changes are **global and permanent**. When the agent determines `temperature = 0.5` works better, it writes that value once. Every future session, sub-agent, and scheduled job inherits it. Day 1's tuning is still active on day 100. The chamberlain validates mutations against known constraints, and the user can undo or override any agent-made change from any channel.

### System and Custom Keys

Ghostpaw ships known system keys with type, default, and validation constraints in code — no database seeding required. If no override exists, the code default applies. Each feature documents its own keys: [Souls](SOULS.md#configuration), [Memory](MEMORY.md#configuration), [Howl](./CHAT.md#howl-as-a-chat-mode). Any unlisted key is custom — type inferred, no restrictions beyond type correctness. Skills and agents persist preferences (`review.style = thorough`, `deploy.target = staging`) with the same history, attribution, and undo.

### Managing Config

```bash
ghostpaw config set temperature 0.7           # type inferred as number
ghostpaw config set default_model claude-sonnet-4-20250514
ghostpaw config get cost_limit_daily_usd       # typed value with metadata
ghostpaw config list                           # grouped by category
ghostpaw config undo temperature               # previous value
ghostpaw config reset temperature              # code default
```

The **web UI** Settings page shows all config organized by category with inline editing, undo, and reset. A model selector with live provider discovery sits above the tabs. The **chamberlain's tools** — `get_config`, `list_config`, `set_config`, `undo_config`, `reset_config` — allow self-tuning with source tracked as `agent`.

### Design Decisions

**No in-memory cache.** Every read through SQLite. WAL mode, small table, indexed. Every session sees the latest value with zero invalidation logic. **Linked-list history.** Current: `WHERE next_id IS NULL`. Undo: pointer swap. Reset: bulk delete. **Defaults in code.** A row means an explicit override; upgrades that change defaults require zero migration. **Flat keys.** `memory_half_life_days`, not `memory.half_life_days`. Greppable, unambiguous, safe for an LLM.

## Scheduling

An agent that only exists when you talk to it is a tool. An agent that wakes itself up, does useful work while you sleep, and goes quiet when there's nothing worth doing — that's ghostpaw operating as intended. The [fundamental shift](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents) is from reactive to temporally autonomous. The scheduler makes this possible: one SQLite table, one 30-second tick loop, [compare-and-swap locking](https://docsaid.org/en/blog/sqlite-job-queue-atomic-claim) for at-most-once execution, and child process isolation following the [Erlang "let it crash" model](https://www.javacodegeeks.com/2026/01/elixirs-let-it-crash-philosophy-when-failing-fast-is-a-feature.html). Per-job timeouts kill runaway processes — [doubling task duration quadruples failure rate](https://zylos.ai/research/2026-01-16-long-running-ai-agents), so bounding runtime is a correctness guarantee. ~500 lines, zero external dependencies.

### What Gets Scheduled

**Haunting** — ghostpaw's autonomous inner life. Private thinking, memory consolidation, proactive outreach. Default: every 30 minutes, disabled until the user enables it. The [PROBE benchmark](https://arxiv.org/abs/2510.19771) found GPT-5 and Claude Opus-4.1 achieve only 40% on autonomous proactive problem-solving — any agent that does this reliably is genuinely differentiated.

**Distillation** — extracting persistent state from closed sessions. Memories, [pack](PACK.md) bond updates, quest reconciliation. Default: every 2 hours. The [spacing effect](https://www.nature.com/articles/s44159-025-00496-0) — one of cognitive science's most robust findings — shows temporal gaps between experience and consolidation produce more durable retention than immediate extraction. [Neural imaging confirms](https://pmc.ncbi.nlm.nih.gov/articles/PMC12007619/) re-encoding through the ventromedial prefrontal cortex, and a [Nature Neuroscience 2026 study](https://www.nature.com/articles/s41593-026-02206-2) found learning rates proportional to duration between experiences.

**Custom schedules** — anything that runs as a shell command. Health checks, backups, workspace monitoring. Ghostpaw creates its own recurring tasks — [self-directed temporal autonomy](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents). [ProAgentBench](https://arxiv.org/abs/2602.04482) (500+ hours, 28,000+ events) found long-term memory significantly enhances proactive intervention timing — ghostpaw improves at knowing *what* to schedule the longer it runs.

### The Tick Loop

Every 30 seconds: clear stale PIDs, check due schedules, claim and spawn. First tick jittered within [0, 30s) — [thundering herd](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) is well-characterized and [full jitter](https://en.wikipedia.org/wiki/Thundering_herd_problem) is the industry-standard mitigation.

Jobs are child processes, not in-process calls. This follows [Erlang/OTP supervision](https://allanmacgregor.com/posts/building-resilient-systems-with-otp-supervisors): error handling code contains [2–10x more bugs](https://www.javacodegeeks.com/2026/01/elixirs-let-it-crash-philosophy-when-failing-fast-is-a-feature.html) than business logic at 20–40% test coverage — isolate and supervise instead. A crashed haunt can't take down the daemon, resources are trackable per-job, custom commands get full shell power. [Long-running task research](https://zylos.ai/research/2026-01-16-long-running-ai-agents) confirms measurable degradation after 35 minutes — short, isolated jobs bound the blast radius.

### At-Most-Once Execution

A schedule must never run twice simultaneously, even across instances sharing the same database. Solved with [compare-and-swap on SQLite](https://docsaid.org/en/blog/sqlite-job-queue-atomic-claim) — a [correctness-proven pattern](https://dl.acm.org/doi/10.1145/1583991.1584003):

```sql
UPDATE schedules
SET next_run_at = ?, running_pid = ?, started_at = ?, updated_at = ?
WHERE id = ? AND next_run_at = ? AND enabled = 1 AND running_pid IS NULL
```

`changes === 1` means the caller won the claim. SQLite's [serialized writes in WAL mode](https://docsaid.org/en/blog/sqlite-wal-busy-timeout-for-workers) provide atomicity. Formal verification — [vMVCC](https://pdos.csail.mit.edu/papers/vmvcc%3Aosdi23.pdf) (OSDI 2023), [TicToc](https://db.cs.cmu.edu/papers/2016/yu-sigmod2016.pdf) (SIGMOD 2016, 92% better throughput) — proves correctness for optimistic concurrency; Ghostpaw's CAS is a simpler instance of the same family.

### Crash Recovery

Every tick checks running processes for two conditions:

1. **Dead**: `running_pid` set but process gone (detected via `process.kill(pid, 0)`).
2. **Timed out**: process alive but `started_at + timeout_ms < now` — scheduler sends SIGKILL and records failure.

Both cases: PID and timestamp cleared, fail count incremented, error recorded. This implements the [lease+heartbeat pattern](https://en.wikipedia.org/wiki/Lease_(computer_science)): PID is the lease, `started_at` the start, `timeout_ms` the duration, the 30-second tick the heartbeat check. In-process enforcement is the primary path (SIGTERM → 5s grace → SIGKILL); tick-based check is backup for cross-restart scenarios. Defaults: haunt 10 minutes, distill 30 minutes. On shutdown: SIGTERM to all children, 5-second wait, then SIGKILL.

### Run Tracking

Each schedule tracks: `timeout_ms` (max runtime), `started_at` (claim timestamp), `run_count`, `fail_count`, `last_run_at`, `last_exit_code`, `last_error` (stderr tail or timeout message, capped at 1KB). No separate logging table — the schedule row is the status dashboard.

### Comparison

OpenClaw's heartbeat reads a static `HEARTBEAT.md` at fixed intervals — whether or not anything changed. [60–80% of tokens wasted](./CHAT.md#haunt-as-a-chat-mode) on "nothing to report." At default intervals: [2–3M tokens/day](https://e2b.dev/blog/how-much-do-ai-agents-cost-comprehensive-cost-analysis) in overhead, [$720+/month](https://www.zenrows.com/blog/ai-agent-cost). Ghostpaw's scheduler is pure temporal infrastructure — it rings the bell; ghostpaw decides whether to act. Haunting uses [adaptive sleep with exponential backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/); Microsoft's [SentinelStep](https://arxiv.org/abs/2502.09228) validated dynamic polling for reduced idle computation. Idle ghostpaw costs near-zero. Agents cost [3–10x more than chatbots](https://www.zenrows.com/blog/ai-agent-cost) — near-zero idle cost is the difference between sustainable and budget sinkhole.

| Dimension | OpenClaw Heartbeat | Ghostpaw Scheduling |
|-----------|-------------------|-------------------|
| Trigger | Fixed cron (every N minutes) | Adaptive per-schedule + haunt backoff |
| What to do | Static checklist (HEARTBEAT.md) | Emergent from soul + memory + skills |
| Idle cost | $1–5/day | Near-zero |
| Custom jobs | Not supported | Unlimited shell commands |
| Runaway protection | None | Per-job timeout (SIGTERM → SIGKILL) |
| Crash safety | None (in-process) | CAS + dead PID detection + child isolation |
| Self-management | None | Chamberlain adapts intervals |
| Concurrency | Undefined | At-most-once via SQLite CAS |

### Managing Schedules

```bash
ghostpaw schedules                        # list all with status
ghostpaw schedules show haunt             # full details
ghostpaw schedules enable haunt           # enable
ghostpaw schedules disable haunt          # disable
ghostpaw schedules create backup \
  --command "tar czf ~/backup.tar.gz ." \
  --interval 1440 --timeout 30           # every 24h, kill after 30min
ghostpaw schedules update haunt --interval 60    # hourly
ghostpaw schedules delete backup                  # remove custom
```

Builtins (`haunt`, `distill`) cannot be deleted — only enabled/disabled or interval-adjusted. The **chamberlain's tools** — `schedule_list`, `schedule_create`, `schedule_update`, `schedule_delete` — handle requests delegated from conversation.

### Design Decisions

**In-process, not external cron.** One process, one database, one scheduler. No systemd timers to configure. Tradeoff: daemon must be running. **Child processes, not in-process calls.** Isolate and supervise — fork overhead is negligible for 30+ minute intervals. **Per-job timeouts.** Haunt: 10 min. Distill: 30 min. [Degradation after 35 minutes](https://zylos.ai/research/2026-01-16-long-running-ai-agents) of continuous agent work — builtins stay below that. Enforced in-process and cross-instance. **Adaptive distillation.** The chamberlain adjusts frequency to session volume — shorter intervals when conversations accumulate, longer when idle — implementing the [MARS framework's](https://arxiv.org/abs/2504.13280) insight that optimal consolidation follows the Ebbinghaus forgetting curve. **Hardcoded 30s tick.** Fast enough for any schedule, slow enough to be invisible. Per-schedule intervals are freely adjustable. **No web UI for scheduling.** CLI and chamberlain tools only. Sessions (including haunt/distill) appear in web session history.

## Why This Matters

Without these three systems, ghostpaw is a chatbot with a shell. Keys leak through conversation payloads, configuration is static and fragile, and the agent exists only when prompted. With them, ghostpaw protects its own credentials through [defense in depth that addresses OWASP's top three LLM risks](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf). It tunes its own operational parameters — every adjustment persisting globally, compounding across sessions, with full audit trail and one-step undo. And it wakes itself on time through crash-safe scheduling that costs zero tokens when idle. Microsoft's [CORPGEN](https://arxiv.org/abs/2504.02160) framework confirms agents need different temporal granularities — immediate reactions, short-term routines, long-term goals — coordinated by a scheduling backbone. [APEMO](https://arxiv.org/abs/2506.01906) research shows trajectory stability improves with structured execution management.

The alternative is what every other agent tool offers: scattered `.env` files the user manages, static configurations nobody tunes, no autonomous behavior between prompts. The consistent finding across the research: structural enforcement beats behavioral policy, persistent state beats ephemeral tweaks, and temporal autonomy is the line between a tool you use and an agent that works for you.

The chamberlain holds the keys, the purse, and the clock. Ghostpaw governs itself.

## Contract Summary

- **Owning soul:** Chamberlain.
- **Product umbrella:** `SETTINGS` is the operational contract spanning `src/core/config/`,
  `src/core/secrets/`, and `src/core/schedule/`.
- **Scope:** credentials, runtime configuration, and temporal orchestration.
- **Non-goals:** user memory, social modeling, or procedural knowledge. Those live in `memory`,
  `pack`, and `skills`.

## Four Value Dimensions

### Direct

The user gets a usable control plane: set credentials safely, tune runtime behavior with audit and
undo, and run ghostpaw on a clock instead of only on demand.

### Active

The coordinator and chamberlain have clear reasons to use settings: resolve which provider is
configured, read or update a typed config key, inspect schedule health, create a recurring job, or
bootstrap runtime state safely.

### Passive

Secrets persist across restarts, config changes compound across sessions, and scheduled maintenance
keeps the system alive in the background without the user manually reapplying state every time.

### Synergies

Other subsystems consume settings mechanically through read-only APIs and runtime hooks: config reads
shape feature behavior, secret status informs provider routing, and schedules trigger haunt, distill,
stoke, and attune without LLM coordination.

## Quality Criteria Compliance

### Scientifically Grounded

The subsystem is grounded in least privilege, defense in depth, auditable shared state,
self-configuration, and crash-safe scheduling research. Each operational mechanism is cited in the
relevant section below.

### Fast, Efficient, Minimal

All three subdomains are local SQLite-backed control planes with small typed tables and cheap reads.
Secrets expose status-only reads, config is flat primitive state, and scheduling uses one tick loop
plus CAS claims instead of external infrastructure.

### Self-Healing

Secrets clean and canonicalize input, config supports undo and reset, and scheduling clears stale
PIDs, enforces timeouts, and recovers after crashes.

### Unique and Distinct

`secrets` owns credentials, `config` owns typed operational parameters, and `schedule` owns temporal
execution. None of these overlap with the factual, procedural, social, or cognitive subsystems.

### Data Sovereignty

Each subdomain owns its own core namespace and write surface. Cross-system reads go through
`api/read/**`; mutations stay within `api/write/**` and chamberlain-approved flows. Secret values are
further restricted to `runtime/**`.

### Graceful Cold Start

Known config defaults work without rows, secrets can be absent without breaking the process, and
builtin schedules seed the runtime immediately with safe defaults.

## Data Contract

### Secrets

- **Primary table:** `secrets`.
- **Canonical models:** `KnownKey`, `SecretStatus`, and `CleanResult`.
- **Invariant:** secret values are never returned by `api/read/**`; value-bearing access lives only in
  `src/core/secrets/runtime/**`.

### Configuration

- **Primary table:** `config`.
- **Canonical models:** `ConfigEntry`, `ConfigInfo`, `KnownConfigKey`, and primitive `ConfigValue`.
- **Invariants:** values stay flat (`string`, `integer`, `number`, `boolean`), every explicit write is
  attributed, and per-key history is preserved through the `nextId` chain.

### Scheduling

- **Primary table:** `schedules`.
- **Canonical models:** `Schedule`, `CreateScheduleInput`, and `UpdateScheduleInput`.
- **Builtin defaults:** `haunt`, `distill`, `stoke`, and `attune`.
- **Invariants:** runs are claimed at most once, timeouts are recorded, and status stays on the row
  instead of in a separate logging subsystem.

## Interfaces

### Secrets

- **Read:** `activeSearchProvider()`, `canonicalKeyName()`, `KNOWN_KEYS`, `listStoredSecretKeys()`,
  and `listSecretStatus()`
- **Write:** `setSecret()` and `deleteSecret()`
- **Runtime:** `getSecretValue()`, `loadSecretsIntoEnv()`, `initSecretsTable()`,
  `setProtectedSecret()`, and `syncProviderKeys()`

### Configuration

- **Read:** `getConfig()`, `KNOWN_CONFIG_KEYS`, `getConfigInfo()`, and `listConfigInfo()`
- **Write:** `setConfig()`, `undoConfig()`, and `resetConfig()`
- **Runtime:** `initConfigTable()`

### Scheduling

- **Read:** `getSchedule()`, `getScheduleByName()`, and `listSchedules()`
- **Write:** `createSchedule()`, `updateSchedule()`, and `deleteSchedule()`
- **Runtime:** `claimSchedule()`, `clearStalePids()`, `completeRun()`, `DEFAULT_SCHEDULES`,
  `getDueSchedules()`, `ensureDefaultSchedules()`, and `initScheduleTables()`

## User Surfaces

- **Conversation:** the coordinator delegates operational work to the chamberlain.
- **CLI:** explicit `config`, `secrets`, and `schedules` commands.
- **Web UI:** settings views for config and secrets, with schedule state surfaced through runtime
  views and session history.
- **Startup/runtime:** secret loading, config defaults, and builtin schedule seeding happen without
  user intervention.

## Research Map

- **Credential isolation and threat model:** `Secrets`
- **Typed state, attribution, and self-tuning:** `Configuration`
- **Temporal autonomy and crash-safe execution:** `Scheduling`
