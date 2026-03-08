# Scheduling

An AI agent that only exists when you talk to it is a tool. An agent that wakes itself up, does useful work while you sleep, and goes quiet when there's nothing worth doing — that's a ghost. The [fundamental shift in agent architecture](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents) is from reactive (prompt-dependent) to temporally autonomous — agents that initiate work, maintain their own state, and operate during off-hours without human oversight. The scheduler is the mechanism that makes Ghostpaw temporally autonomous: a lean, crash-safe job engine that wakes the ghost on time and gets out of the way. It provides the *when*. The ghost decides the *what*.

One SQLite table, one 30-second tick loop, [compare-and-swap locking](https://docsaid.org/en/blog/sqlite-job-queue-atomic-claim) that guarantees at-most-once execution even across multiple instances sharing the same database. Two built-in schedules — [haunting](../HAUNT.md) and session distillation — plus unlimited custom schedules for anything the ghost or user needs to happen on a timer. Jobs run as isolated child processes following the [Erlang "let it crash" supervision model](https://www.javacodegeeks.com/2026/01/elixirs-let-it-crash-philosophy-when-failing-fast-is-a-feature.html) — isolate the work, let it fail cleanly, detect, record, recover. Per-job timeouts kill runaway processes before they compound: [doubling task duration quadruples failure rate](https://zylos.ai/research/2026-01-16-long-running-ai-agents), so bounding runtime is a correctness guarantee, not a convenience. Dead and timed-out processes are detected and cleaned up automatically. The whole system is ~500 lines of code with zero external dependencies.

## What Gets Scheduled

**Haunting** — the ghost's autonomous inner life. Private thinking, memory consolidation, proactive outreach. Default: every 30 minutes, disabled until the user enables it. When enabled, the scheduler fires `ghostpaw haunt` as a child process. What happens inside that process — the soul that runs, the tools it uses, the journal it writes — is entirely up to the ghost's accumulated experience. The scheduler just rings the bell. The [PROBE benchmark](https://arxiv.org/abs/2510.19771) found that even GPT-5 and Claude Opus-4.1 achieve only 40% on autonomous proactive problem-solving — searching for unspecified issues and resolving them without being asked. Any agent that does this reliably through accumulated context is genuinely differentiated; the scheduler is what makes it possible.

**Distillation** — extracting persistent state from closed sessions. Memories, [pack](PACK.md) bond updates, quest reconciliation. Default: every 2 hours, enabled from day one. This is the ghost's bookkeeping cycle — making sure everything said in conversation becomes durable understanding. The 2-hour default isn't arbitrary: the [spacing effect](https://www.nature.com/articles/s44159-025-00496-0) — one of the most robust findings in cognitive science — shows that temporal gaps between experience and consolidation produce more durable retention than immediate extraction. [Neural imaging confirms](https://pmc.ncbi.nlm.nih.gov/articles/PMC12007619/) this works through re-encoding in the ventromedial prefrontal cortex, and a [Nature Neuroscience 2026 study](https://www.nature.com/articles/s41593-026-02206-2) found that learning rates are proportional to duration between experiences — spacing matters more than frequency. The scheduler fires `ghostpaw distill` and the [warden](SOULS.md#persistence-and-infrastructure-souls) does the work.

**Custom schedules** — anything that runs as a shell command. Health checks, backup scripts, data syncs, workspace monitoring. Created through the [chamberlain's](SOULS.md#persistence-and-infrastructure-souls) tools or the CLI. The ghost can create its own recurring tasks — a form of [self-directed temporal autonomy](https://zylos.ai/research/2026-02-16-autonomous-task-scheduling-ai-agents) managed by the infrastructure soul that governs the operational layer. [ProAgentBench](https://arxiv.org/abs/2602.04482) (500+ hours of user sessions, 28,000+ events) found that long-term memory and historical context significantly enhance prediction accuracy for proactive intervention timing — the ghost gets better at knowing *what* to schedule the longer it runs.

## How It Works

### The Tick Loop

The scheduler runs in-process alongside the daemon. Every 30 seconds, it ticks: clear stale PIDs, check for due schedules, claim and spawn. First tick is jittered randomly within [0, 30s) to prevent [thundering herd](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — the well-characterized problem where synchronized startup creates load spikes exceeding steady-state capacity by orders of magnitude. Full jitter (`random_between(0, interval)`) is the [industry-standard mitigation](https://en.wikipedia.org/wiki/Thundering_herd_problem): fixed delays without randomness paradoxically create synchronized retry waves, while jitter disperses them to approximately constant rates.

Jobs are child processes, not in-process function calls. `ghostpaw haunt` spawns a separate Node process that runs the full haunt pipeline. `ghostpaw distill` does the same for session extraction. Custom schedules spawn `/bin/sh -c <command>`. This follows the [Erlang/OTP supervision philosophy](https://allanmacgregor.com/posts/building-resilient-systems-with-otp-supervisors): error handling code contains [2-10x more bugs](https://www.javacodegeeks.com/2026/01/elixirs-let-it-crash-philosophy-when-failing-fast-is-a-feature.html) than business logic with only 20-40% test coverage, so isolate the work and let supervision handle recovery instead. A crashed haunt can't take down the daemon, resource usage is trackable per-job, and custom commands get full shell power without risking the parent process. Research on [long-running agent tasks](https://zylos.ai/research/2026-01-16-long-running-ai-agents) confirms the principle: doubling task duration quadruples failure rate, with measurable degradation after 35 minutes — short, isolated jobs bound the blast radius.

### At-Most-Once Execution

The critical invariant: a schedule must never run twice simultaneously, even if multiple Ghostpaw instances share the same database. This is solved with a [compare-and-swap on SQLite](https://docsaid.org/en/blog/sqlite-job-queue-atomic-claim) — a [recognized, correctness-proven pattern](https://dl.acm.org/doi/10.1145/1583991.1584003) for at-most-once execution:

```sql
UPDATE schedules
SET next_run_at = ?, running_pid = ?, started_at = ?, updated_at = ?
WHERE id = ? AND next_run_at = ? AND enabled = 1 AND running_pid IS NULL
```

The `WHERE` clause is the CAS: it succeeds only if `next_run_at` hasn't changed (no other instance claimed it first) AND `running_pid` is null (no instance is already running it). `started_at` records the claim timestamp for timeout enforcement. If `changes === 1`, the caller won the claim. If `changes === 0`, someone else got there first. No locks, no coordination protocol, no external dependencies. SQLite's [serialized writes in WAL mode](https://docsaid.org/en/blog/sqlite-wal-busy-timeout-for-workers) provide the atomicity. Formal verification research like [vMVCC](https://pdos.csail.mit.edu/papers/vmvcc%3Aosdi23.pdf) (OSDI 2023) and [TicToc](https://db.cs.cmu.edu/papers/2016/yu-sigmod2016.pdf) (SIGMOD 2016, 92% better throughput) has proven correctness for optimistic concurrency protocols — Ghostpaw's CAS is a simpler instance of the same family.

### Crash Recovery

Every tick checks for problematic running processes — two conditions trigger cleanup:

1. **Dead processes**: `running_pid` is set but the process no longer exists. Detection uses `process.kill(pid, 0)`, which tests liveness without sending a signal.
2. **Timed-out processes**: the process is alive but `started_at + timeout_ms < now`. The scheduler sends SIGKILL and records the timeout as a failure.

In both cases: `running_pid` and `started_at` are cleared, `fail_count` incremented, `last_error` recorded. The schedule becomes eligible for the next tick. This is a lightweight implementation of the [lease+heartbeat pattern](https://en.wikipedia.org/wiki/Lease_(computer_science)) used in distributed systems: the running PID acts as a lease, `started_at` is the lease start, `timeout_ms` is the lease duration, and the 30-second tick acts as the heartbeat check.

In-process timeout enforcement is the primary path: when a job exceeds its `timeout_ms`, the spawning scheduler sends SIGTERM, waits 5 seconds, then SIGKILL. The tick-based check is the backup for cross-restart and multi-instance scenarios. Builtin defaults: haunt times out at 10 minutes, distill at 30 minutes.

On shutdown, the scheduler sends SIGTERM to all running children, waits up to 5 seconds, then SIGKILL. No orphaned processes. No zombie jobs blocking the next startup.

### Run Tracking

Every schedule maintains counters, diagnostics, and limits in the same row:

- `timeout_ms` — maximum runtime before the job is killed (null = no limit)
- `started_at` — timestamp when the current run was claimed (null when idle)
- `run_count` — total successful + failed runs
- `fail_count` — runs that exited non-zero or timed out
- `last_run_at` — when the most recent run completed
- `last_exit_code` — 0 for success, non-zero for failure
- `last_error` — stderr tail or timeout message from the last failed run (capped at 1KB)

No separate logging table. No log rotation. The schedule row is the status dashboard.

## The Chamberlain Manages the Clock

Scheduling tools — `schedule_list`, `schedule_create`, `schedule_update`, `schedule_delete` — belong to the [chamberlain](SOULS.md#persistence-and-infrastructure-souls), the ghost's infrastructure governor. The coordinator has no scheduling tools. This follows the same structural isolation pattern as [secrets](SECRETS.md) and [config](CONFIG.md): infrastructure operations are managed by a dedicated soul with the expertise to handle them correctly.

The chamberlain can adjust haunt frequency based on activity patterns, create maintenance windows for intensive operations, or set up custom schedules in response to user requests. Critically, the chamberlain adapts distillation frequency to session volume: shortening the interval when undistilled conversations accumulate rapidly, lengthening it during quiet periods. This implements the [MARS framework's](https://arxiv.org/abs/2504.13280) insight that optimal consolidation timing follows the Ebbinghaus forgetting curve — active periods need faster extraction to prevent context loss, while idle stretches benefit from spacing. Builtin schedule commands are protected — you can change their interval, timeout, and enable/disable them, but you can't change what `haunt` or `distill` actually do. Custom schedules are fully mutable.

Minimum interval: 1 minute. Enforced on both creation and update. This prevents runaway scheduling from burning resources — the scheduler is a responsible clock, not an infinite loop.

## How This Compares

OpenClaw's heartbeat is a static `HEARTBEAT.md` file that the agent reads and executes at fixed intervals. Every interval, the agent reads the file, runs the checklist, and reports results — whether or not anything has changed. [60–80% of those tokens are wasted on "nothing to report" cycles](../HAUNT.md). At default intervals that's [2–3 million tokens per day](https://e2b.dev/blog/how-much-do-ai-agents-cost-comprehensive-cost-analysis) in overhead alone — [$720+/month](https://www.zenrows.com/blog/ai-agent-cost) for fixed-rate polling that doesn't adapt to silence. It's a cron job wearing an LLM costume.

Ghostpaw's scheduler is pure temporal infrastructure. It rings the bell; the ghost decides whether to act. Haunting uses adaptive sleep — [exponential backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) when nothing is worth doing, immediate wake on events. Microsoft's [SentinelStep](https://arxiv.org/abs/2502.09228) research validated this approach: dynamic polling with variable wait times reduces idle computation while maintaining responsiveness. An idle ghost costs near-zero. An active ghost spends tokens only when its accumulated context produces something worth pursuing. The scheduler's cost is zero — it's a `setTimeout` loop checking a SQLite row. The LLM cost is proportional to value produced, not to clock ticks elapsed. Research confirms agents cost [3–10x more than chatbots](https://www.zenrows.com/blog/ai-agent-cost) — making idle cost near-zero is the difference between a sustainable system and a budget sinkhole.

| Dimension | OpenClaw Heartbeat | Ghostpaw Scheduling |
|-----------|-------------------|-------------------|
| Trigger | Fixed cron (every N minutes) | Adaptive: configurable per-schedule + haunt backoff |
| What to do | Static checklist (HEARTBEAT.md) | Emergent from soul + memory + skills |
| Idle cost | $1–5/day (reads file, reports nothing) | Near-zero (scheduler ticks, ghost sleeps) |
| Custom jobs | Not supported | Unlimited shell commands |
| Runaway protection | None | Per-job timeout (SIGTERM → SIGKILL) |
| Crash safety | None (in-process) | CAS locking + dead PID detection + child process isolation |
| Self-management | None | Chamberlain adapts intervals based on activity |
| Concurrency | Undefined | At-most-once via SQLite CAS |

## Managing Schedules

**Terminal:**

```bash
ghostpaw schedules                        # list all schedules with status
ghostpaw schedules show haunt             # full details (interval, timeout, runs, errors)
ghostpaw schedules enable haunt           # enable a schedule
ghostpaw schedules disable haunt          # disable a schedule
ghostpaw schedules create backup \
  --command "tar czf ~/backup.tar.gz ." \
  --interval 1440 --timeout 30           # every 24h, kill after 30min

ghostpaw schedules update haunt --interval 60    # change to hourly
ghostpaw schedules update distill --timeout 15   # tighten distill timeout to 15min
ghostpaw schedules delete backup                  # remove a custom schedule
```

Builtin schedules (`haunt`, `distill`) cannot be deleted — only enabled, disabled, or have their interval changed.

**Agent tools:** The chamberlain uses `schedule_list`, `schedule_create`, `schedule_update`, and `schedule_delete` during delegation. The coordinator asks "set up a nightly backup" and the chamberlain creates the schedule with the right interval and command.

## Design Decisions

**In-process, not external cron.** The scheduler runs inside the Ghostpaw daemon. No systemd timers to configure, no crontab to maintain, no external dependency that might not exist on the user's OS. One process, one database, one scheduler. The tradeoff: if the daemon isn't running, nothing fires. This is acceptable because Ghostpaw's value comes from the daemon being up — if it's down, scheduling is the least of the missing capabilities.

**Child processes, not in-process calls.** Each job spawns a separate process. [Error handling code contains 2–10x more bugs](https://www.javacodegeeks.com/2026/01/elixirs-let-it-crash-philosophy-when-failing-fast-is-a-feature.html) than the code it protects, at only 20–40% test coverage. The Erlang/OTP answer: don't handle — isolate and supervise. That's what the scheduler does. The cost is fork overhead, which is negligible for jobs that run every 30+ minutes.

**Per-job timeouts, not global.** Each schedule has its own `timeout_ms` — haunt defaults to 10 minutes, distill to 30 minutes, custom schedules to no limit. [Task duration scaling research](https://zylos.ai/research/2026-01-16-long-running-ai-agents) shows measurable degradation after 35 minutes of continuous agent work, so builtin timeouts are set well below that threshold. The timeout is enforced both in-process (immediate SIGTERM → SIGKILL) and cross-instance (tick-based `started_at + timeout_ms` check). The chamberlain can adjust timeouts per-schedule when workload characteristics change.

**No config key for tick interval.** The 30-second tick is hardcoded. Per-schedule intervals live in the database and are freely adjustable. The tick rate is infrastructure plumbing — fast enough to catch any reasonable schedule, slow enough to be invisible. Making it configurable would add a knob that nobody should need to turn.

**No web UI for scheduling.** Schedules are managed through the CLI and through the chamberlain's tools. The web UI shows session history (which includes haunt and distill sessions) but doesn't expose schedule management directly. This is a deliberate scope choice — scheduling is infrastructure, not a feature surface the user interacts with daily.

## Why This Matters

Without a scheduler, the ghost exists only when prompted. It has no temporal autonomy — no ability to wake itself, maintain its own data, or act on its own initiative. Every capability that makes Ghostpaw feel present — haunting, proactive outreach, memory consolidation, pack maintenance — depends on something waking the ghost up on time. Microsoft's [CORPGEN](https://arxiv.org/abs/2504.02160) framework for multi-horizon task management confirms that agents need different temporal granularities — immediate reactions, short-term routines, and long-term goals — coordinated by a single scheduling backbone. Ghostpaw's three schedule types (distillation, haunting, custom) map directly to this structure.

The scheduler is the simplest subsystem in Ghostpaw by design. One table, one loop, one locking primitive. It does one thing: fire jobs reliably, on time, without duplication, with crash recovery. No intelligence. No opinions about what to run. No wasted tokens on empty cycles. [APEMO](https://arxiv.org/abs/2506.01906) research on runtime scheduling for LLM agents shows that trajectory stability — keeping agents from wandering off task — improves with structured execution management. The scheduler provides this structure by constraining job frequency, enforcing isolation, and tracking outcomes.

The ghost's temporal life is richer than a timer — haunting involves private thinking, soul-informed judgment, adaptive sleep, proactive communication. But all of that richness sits above the scheduler, not inside it. The scheduler is the heartbeat. What the ghost does with each beat — that's up to the ghost.
