# Harness

A harness turns a raw LLM into a working agent. The LLM alone is stateless — it receives text and produces text, forgetting everything between calls. A harness wraps that core capability with four concerns: **capabilities** that extend what the agent can do, a **synchronous loop** that governs how each interaction runs, an **asynchronous pulse** that gives the agent temporal autonomy between conversations, and **channels** that connect the agent to the outside world.

The synchronous path (interceptor) augments every conversation turn with transparent subsystem maintenance. The asynchronous path (pulse) fires scheduled work independently of whether anyone is talking. Together they make ghostpaw an agent that improves during conversation and acts between conversations.

## The Core Mechanic

Every interaction follows the same structure. A chat is a **system prompt** that sets the agent's identity and behavior, a **message history** of alternating user and assistant turns, and **tool calls** the assistant makes in between. The system prompt is fixed for the session. The message history grows with every turn. Tool calls let the agent act on the world — read files, run code, search the web — and fold the results back into the conversation before producing its final response.

This is powered by [chatoyant](https://github.com/nicosResworworking/chatoyant), a provider-agnostic LLM library that handles streaming, tool execution, and the iterative generate→call→generate loop natively. The harness doesn't orchestrate tool calls — chatoyant does. The harness provides the tools, manages the context, and persists the results.

## The Agent Loop

```mermaid
graph TD
    A[User Message] --> B[Persist User Message]
    B --> C{Interceptor Enabled?}
    C -- no --> F
    C -- yes --> D[Run Subsystems Concurrently]
    D --> E[Persist Synthetic Entries]
    E --> F[Reconstruct Full History from SQLite]
    F --> G[LLM Generate — streaming, tool calls]
    G --> H{Tool Calls?}
    H -- yes --> I[Execute Tools]
    I --> J[Fold Results into Context]
    J --> G
    H -- no --> K[Persist Turn Atomically]
    K --> L[Return to Channel]
```

A single turn can loop through the tool-call cycle many times. The agent reads a file, discovers it needs another, reads that, edits both, runs a test — all within one turn. The channel sees streaming text chunks as the final response forms. When the turn completes, everything is persisted atomically.

The interceptor step is the key addition over a raw LLM loop. Before the LLM generates, registered subsystems run concurrently in child sessions. Their results are injected into the message history as synthetic tool call entries. The LLM sees them as prior tool results and naturally incorporates the information. See `INTERCEPTOR.md` for the full mechanics.

## Pulse

The pulse engine runs alongside the agent loop as an in-process scheduler. Every 60 seconds it checks the `pulses` table for due work, claims it via compare-and-swap, and dispatches it by type. The agent loop handles what happens during a conversation. Pulse handles what happens between conversations — or in parallel with them.

```mermaid
graph TD
    Timer["60s tick"] --> Timeouts["Handle timeouts"]
    Timeouts --> Due["Fetch due pulses"]
    Due --> Claim["CAS claim"]
    Claim --> Type{"Dispatch by type"}
    Type -- builtin --> Builtin["In-process handler"]
    Type -- agent --> Agent["Create pulse session, full agent turn"]
    Type -- shell --> Shell["spawn /bin/sh -c"]
    Builtin --> Record["Record in pulse_runs"]
    Agent --> Record
    Shell --> Record
    Record --> Wait["Wait for next tick"]
```

Three execution modes serve different cost/capability tradeoffs:

**Builtin** pulses are in-process TypeScript functions — zero tokens, zero spawn overhead. The default heartbeat is a builtin that runs every 5 minutes, proving the agent is alive through mechanical metrics (session counts, failing pulses, DB page count) without burning LLM budget. This is the key architectural difference from systems like OpenClaw, whose heartbeat reads a static checklist through the LLM on every cycle — [60–80% of tokens wasted](https://arxiv.org/abs/2509.21224) on "nothing to report," [$720+/month](https://www.zenrows.com/blog/ai-agent-cost) at default intervals.

**Agent** pulses create a `purpose: "pulse"` chat session and execute a full agent turn with all tools. Each has a specific prompt and a specific schedule — the LLM gets a focused task, not a vague mandate. Agent pulses persist to the same session/message substrate as conversation turns, so their work is visible, auditable, and can feed into future context.

**Shell** pulses spawn child processes with stdout/stderr capture, PID tracking, and kill escalation. The heaviest mode but the most capable — anything the system can run, pulse can schedule.

Safety is enforced at every level: CAS at-most-once claiming, 5-concurrent-dispatch cap, per-job timeouts with SIGTERM→SIGKILL escalation, memory-bounded output capture (2KB), startup stale-run recovery, and automatic 7-day history pruning.

The `pulse` tool gives the LLM full CRUD management over schedules — all operations by numeric ID. Builtins are protected from deletion and command mutation. See `PULSE.md` for full detail on the scheduling model, safety mechanisms, schema, and implementation.

## Capabilities

Capabilities are the tools the agent can call. Each tool is a typed function with a name, description, parameter schema, and execute handler. The LLM sees the name and description, decides when to call it, and receives structured results.

**Filesystem** — `read`, `write`, `edit`, `ls`, `grep`. Full read/write access to the local filesystem. The agent can navigate, inspect, create, and modify files and directories.

**Shell** — `bash`. Arbitrary command execution with timeout, output capture, and secret scrubbing.

**Web** — `web_search`, `web_fetch`. Search the web via configurable providers (Brave, Tavily, Serper, DuckDuckGo) and fetch/extract page content.

**Scheduling** — `pulse`. List, create, update, enable, disable, and delete scheduled background tasks. Agent-type pulses run stored prompts as autonomous turns; shell-type pulses run bash commands. All operations by numeric ID.

**Augmentation** — `calc`, `datetime`. These compensate for known LLM weaknesses. LLMs hallucinate arithmetic and lose track of time. A deterministic calculator and a precise date/time engine eliminate both failure modes entirely.

**Subsystem deflection** — one `subsystem_<name>` tool per registered subsystem (e.g., `subsystem_scribe`, `subsystem_innkeeper`). These prevent the LLM from calling subsystem tools directly. When the LLM sees synthetic tool results in its history and tries to invoke the tool itself, the deflection handler returns an instant message explaining the subsystem runs automatically. Zero-cost, one iteration, no child session.

## Lossless Persistence

Every message, every tool call (name + arguments), and every tool result is stored in SQLite with foreign-key integrity and strict typing. The full conversation can be reconstructed exactly as chatoyant saw it — no lossy serialization, no summarization, no dropped fields.

Three core tables carry the chat state:

- **sessions** — identity, model, system prompt, purpose (`chat` | `subsystem_turn` | `system` | `pulse`), parent linkage, timestamps. Pulse sessions are created by agent-type pulses and linked back to the pulse via `pulse_runs.session_id`.
- **messages** — ordered by `(session_id, ordinal)`. Roles are `user`, `assistant`, or `tool`. Source is `organic` (user/LLM-produced) or `synthetic` (harness-injected). Usage and cost data live on assistant messages. Tool result messages carry `tool_call_id` linking them to the call they answered.
- **tool_calls** — keyed by the provider-assigned `id`, linked to the assistant message that initiated them. Arguments are stored as the original JSON string from the provider — never parsed and re-serialized.

Two additional tables carry the pulse state:

- **pulses** — schedule definition and runtime state machine. Type, command, interval/cron/one-off scheduling, timeout, enabled flag, running state with PID tracking, run count, and last exit code.
- **pulse_runs** — append-only run history with timing, exit code, output, error, and optional session linkage for agent runs. Pruned automatically after 7 days.

This is not logging. This is the agent's working memory. Every subsequent turn reconstructs the full history from the chat tables via a single LEFT JOIN query. The pulse tables track the agent's autonomous lifecycle. If the process restarts, conversations continue exactly where they left off and stale pulse runs are recovered cleanly.

## Channels

Channels connect the agent to users and systems. The agent and session model are channel-agnostic — channels manage their own session references and presentation, but the underlying turn execution is identical regardless of how the user arrived.

**TUI** — interactive terminal interface with alt-screen rendering, streaming output, scroll, tool status indicators, and slash commands. The default when a TTY is detected.

**CLI** — one-shot command execution. Accepts a prompt, returns the response and a `session:<id>` continuation token on stderr for machine consumption. Enables multi-turn interactions for scripts, pipelines, and automation without an interactive interface.

Both channels drive the same `Agent` interface. Future channels (web, Telegram) plug into the same boundary without touching the loop or the persistence layer. Pulse runs independently of all channels — it fires on timers whether or not any channel is active.

## Settings

A single SQLite table stores every configuration value and every secret. The canonical key is the environment variable name — `ANTHROPIC_API_KEY`, `GHOSTPAW_MODEL`, `GHOSTPAW_BASH_TIMEOUT_S` — no mapping layer, no translation. At boot, environment variables sync into the database; the database then pushes all settings (including code defaults for unset keys) into `process.env`. Every change via tool, slash command, or CLI updates both the database and `process.env` atomically. Child processes inherit the full environment. No restart required for any setting change — it takes effect immediately across the entire process tree.

Secrets are marked at the key level. Their values never appear in tool output (masked as `***`), and an in-memory registry scrubs them from bash stdout/stderr before the LLM sees it. Input cleaning strips whitespace, quotes, and `export VAR=` syntax. Cross-slot validation catches wrong-provider keys (an Anthropic key pasted into the OpenAI slot). The attack surface is structural: the LLM can reference keys by name but never reads secret values — they resolve at the point of use.

Every write creates a new row linked to its predecessor in a per-key chain. Source tracking records `user`, `chat`, or `env`. Undo walks the chain backward one step. Reset deletes the chain, returning to the code default. This immutable provenance is [what research identifies](https://arxiv.org/abs/2505.18279) as the key requirement for auditable shared state in multi-agent systems, and [SQLite transactions prevent the 95% deadlock rate](https://arxiv.org/abs/2602.13255) that emerges when LLM agents compete for shared state without external coordination.

Three model tiers — `GHOSTPAW_MODEL_SMALL`, `GHOSTPAW_MODEL`, `GHOSTPAW_MODEL_LARGE` — auto-resolve per provider on boot. Today they define a global default. When the quest system provides per-task complexity estimation and independent sessions, they become the routing targets for [per-task model selection](https://arxiv.org/abs/2601.19402) — trivial work on the small model, hard reasoning on the large, everything else on the default. The settings infrastructure is the menu; the quest dispatcher will be the router.

## What's Built

The harness is minimal but complete. It runs the LLM loop with tool access, persists everything losslessly, exposes the agent through two channels, augments every turn via the interceptor, schedules autonomous work via the pulse engine, and manages all operational state through a unified settings layer.

**Interceptor subsystems** (synchronous, every turn):

- **Scribe** — belief-based memory via `@ghostpaw/codex`. Maintains a store of atomic beliefs extracted from conversation, with recall, revision, and supersession. Tested across five LLM providers.
- **Innkeeper** — social graph via `@ghostpaw/affinity`. Maintains contacts, relationships, interactions, commitments, and recurring dates. Knows every face and every story that passes through.

Both run concurrently on every turn. The interceptor is generic — adding a third subsystem means implementing a `run()` function and registering it. The harness, the turn loop, the synthetic entry format, the context filtering, the configuration — all of it works for N subsystems without modification.

**Pulse engine** (asynchronous, scheduled):

- **Heartbeat** — builtin, every 5 minutes, zero tokens. Mechanical health check: session counts, failing pulses, DB page count.
- **Agent pulses** — user/LLM-created. Run stored prompts as full agent turns on a schedule. Autonomous reasoning tasks with all tool access.
- **Shell pulses** — user/LLM-created. Run bash commands on a schedule. Backups, monitoring, external integrations.

Three scheduling modes (interval, cron, one-off), CAS at-most-once locking, 5-concurrent-dispatch cap, per-job timeouts, startup recovery. The `pulse` tool gives the LLM full CRUD management. See `PULSE.md` for full detail.

**Settings** (operational infrastructure):

- **29 known keys** — model tiers, provider secrets, tool limits, interceptor config, pulse tuning. Code defaults apply without database rows; explicit overrides are attributed and reversible.
- **Secrets** — 7 provider/channel keys with output scrubbing, input cleaning, cross-slot validation. Masked in all tool output and list views.
- **Surfaces** — `settings` LLM tool, `/config` and `/secret` slash commands, `ghostpaw config` and `ghostpaw secret` CLI with interactive masked input for secrets.
