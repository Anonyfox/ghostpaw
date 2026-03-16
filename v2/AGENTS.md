# Ghostpaw v2

Single-process AI agent runtime. One compiled artifact, one SQLite database, one process. Evolutionary identity, provider-independent persistence. The ghost that grows.

## Before You Write Code

Read `docs/GHOSTPAW.md`. Not skimming — reading. It sets the orientation that makes the rest of this codebase make sense. Then read `docs/code/CODE.md` for how code is written and `docs/code/ARCHITECTURE.md` for where things belong. These three documents are mandatory context for every session. The quality of what you build depends on whether you absorbed them or merely scanned them.

If you are working on a specific system, also read its spec:

| System | Spec | Status | What it covers |
|--------|------|--------|----------------|
| Souls | `docs/features/SOULS.md` | **Implemented** | Evolutionary identity, traits, refinement, level-up |
| Memory | `docs/features/MEMORY.md` | **Implemented** | Belief-based storage, recall, embeddings, confidence decay |
| Settings | `docs/features/SETTINGS.md` | **Implemented** | Secrets, configuration, scheduling — chamberlain-managed infrastructure |
| Haunting | `docs/features/CHAT.md` | **Implemented** | Haunt cycle, scheduled via builtin scheduler |
| Quests | `docs/QUESTS.md` | **Implemented** | Unified task/event/calendar system, temporal awareness, Quest Board |
| Pack | `docs/features/PACK.md` | **Implemented** | Social bonds, Theory of Mind, relational identity |
| Pawprints | `docs/PAWPRINT.md` | **Spec only** | Situated experiential knowledge, discovery by presence |

Specs marked "Implemented" have full code in `src/`. Specs marked "Spec only" are design documents with zero implementation — no code, no tables, no tools. Don't reference unimplemented systems as if they exist.

Additional docs not tied to a single module:

| Doc | What it covers |
|-----|----------------|
| `docs/USP.md` | Product positioning and value proposition |
| `docs/research/PROPRIOCEPTIVE_SENSING.md` | Research paper behind the sense system in `lib/sense/` |

## What's Built

The runtime is fully operational. It builds to `dist/ghostpaw.mjs`, opens `ghostpaw.db`, and serves four channels simultaneously.

### Core modules (`src/core/`)

| Module | What it does |
|--------|-------------|
| `chat/` | Sessions, messages, streaming, compaction, locking, cost queries, spend tracking |
| `souls/` | 6 mandatory souls with evolutionary traits, level-up, dormancy, backfill |
| `memory/` | Belief-based recall with confidence decay, trigram + FTS5 search |
| `pack/` | Social bonds, contacts, identity resolution, member merging, Theory of Mind |
| `quests/` | Unified task/event/calendar system, temporal awareness, quest board, FTS5 |
| `howl/` | Proactive outreach — routing metadata, origin tracking, delivery lifecycle |
| `skills/` | Git-backed skill files, checkpoint/rollback, validation, repair |
| `config/` | Flat key-value store with changelog, attribution, undo |
| `schedule/` | Job scheduling — CAS-based at-most-once locking, builtin + custom jobs |
| `secrets/` | Encrypted credential store, env var sync, alias resolution |

Modules that moved to `lib/`: `models/` (provider registry), `service/` (systemd/launchd/cron), `cost/` (pure spend computation — query functions live in `chat/`).

### Harness (`src/harness/`)

The entity composition layer. `createEntity` wires core modules into a working agent:

- **Context assembly** — soul + environment + skill index + tool guidance. Fully static, no automatic memory injection. Persistence access is explicit through warden delegation.
- **Delegation** — foreground and background, with soul-switching to specialists, per-soul tool surfaces, auto-resume
- **Haunt cycle** — context analysis, seed selection, multi-turn execution, warden consolidation, howl extraction
- **Howl cycle** — reply and dismiss flows with warden consolidation in system sessions
- **Oneshots** — title generation, compaction summarization, session distillation, soul text generation, essence rewriting
- **Mentor/trainer invocation** — `invokeMentor`, `invokeTrainer` with two-phase propose/execute

### Tools (per-soul surfaces, delegation-first)

**Coordinator (ghostpaw, 13 tools):** filesystem (read, write, edit, ls, grep, bash), web (web_search, web_fetch), mcp, sense, howl, delegate, check_run. No persistence or infrastructure tools — delegates to specialists.

**Warden (23 tools):** memory (recall, remember, revise, forget), pack (pack_sense, pack_meet, pack_bond, pack_note, contact_add, contact_remove, contact_list, contact_lookup, pack_merge), quests (quest_create, quest_update, quest_done, quest_list, quest_accept, quest_dismiss, storyline_create, storyline_list), datetime, recall_haunts. No filesystem, web, or delegation.

**Chamberlain (16 tools):** config (get, list, set, undo, reset), secrets (list, set, remove), schedule (list, create, update, delete), costs (cost_summary, cost_check), calc, datetime. No filesystem, web, or delegation.

**Mentor (shared + 7):** shared tools + review_soul, propose_trait, revise_trait, revert_trait, reactivate_trait, execute_level_up, revert_level_up.

**Trainer (shared + 7):** shared tools + review_skills, create_skill, checkpoint_skills, skill_diff, skill_history, rollback_skill, validate_skills.

### Channels (`src/channels/`)

| Channel | Status | What it does |
|---------|--------|-------------|
| `tui/` | **Working** | Full terminal UI — alt-screen, streaming, scroll, tool status. Default when TTY. |
| `web/` | **Working** | Preact SPA + Bootstrap. Dashboard, chat (WebSocket), sessions, souls, memories, settings, costs, training. Password-protected. |
| `telegram/` | **Working** | grammY long-polling, background delegation notifications. |
| `cli/` | **Working** | Full subcommand tree: run, secrets, config, souls, memory (list/search/show + warden commands), pack (list/show/history/count/patrol + warden commands), sessions, skills, costs, distill, train, scout, schedules, service. |
| Daemon | **Working** | No-TTY mode: web + telegram until SIGTERM. |

### Additional systems

- **Sense** (`lib/sense/`, `tools/sense.ts`) — Proprioceptive text quality measurement. Compression ratio, negation density, semantic distance, momentum, phase transitions. Detects premature convergence, highway drift, abandoned breakthroughs.
- **Distillation** (`harness/distill_pending.ts`, `oneshots/distill_session.ts`) — Post-session persistence extraction via warden. Sweeps closed/stale sessions, extracts memories, updates pack bonds, reconciles quests. Runs at startup and on a builtin schedule (every 2h).
- **Scheduler** (`harness/scheduler.ts`, `core/schedule/`) — In-process job scheduler using event-loop timers. CAS-based at-most-once locking across multiple instances. Spawns CLI subcommands as child processes. Builtin schedules: `haunt` (30m, disabled by default), `distill` (2h, enabled). Custom schedules via chamberlain tools.
- **Default souls** — ghostpaw (coordinator), js-engineer (builder), mentor (soul refiner), trainer (skill builder), warden (persistence keeper), chamberlain (infrastructure governor). Each with essence + baseline traits.
- **Default skills** — `effective-writing` (universal writing craft), `skill-mcp` (MCP server integration guide).

## What's NOT Built

- **Haunt auto-tuning** — Haunt scheduling exists (builtin schedule, disabled by default) but there is no adaptive interval or idle detection. The agent or user enables and tunes the interval manually.
- **Pawprints** — No discovery-by-presence tooling, no territory map. The convention (`.pawprint.md` files) is defined but no code supports it.
- **Fitness evaluation** — Temporal evidence signals exist (windowed delegation stats, per-trait effectiveness, cost trends) but refinement is manually triggered (CLI, web, or scheduled runs). No automated fitness-triggered refinement.
- **Cross-soul pattern detection** — No migration between soul islands.

## Architecture

Five layers, strictly ordered. Higher depends on lower. Never reverse. Never sideways.

```
5.  channels/         user-facing — telegram, web, cli, tui
4.  harness/          entity composition, context assembly, oneshots
3.  tools/            agent syscalls — what the LLM can call
2.  core/             domain logic — one subfolder per feature
1.  lib/              pure utilities — domain-independent
```

Each feature in `core/` owns its types, logic, default content, tests, and database tables. Tools call into core for domain operations. Channels drive the entity, never call tools directly.

## Conventions

- **ESM only.** TypeScript strict mode. `.ts` extensions on all imports.
- **Node 24+.** Native TS type stripping. `node:sqlite` dynamically imported always.
- **Biome.** 2-space indent, double quotes, trailing commas, semicolons, 100 chars.
- **One thing, one file.** One primary export per file. No exceptions.
- **Every file has a colocated test.** `thing.ts` → `thing.test.ts`. Tests written first.
- **Tests use `node:test` and `node:assert`.** No real I/O — in-memory database, mocked network.
- **No `any` without justification.** No `utils.ts`. No junk drawers.
- **No emoji in terminal output.** Cargo/esbuild style: labeled lines, dim secondary, cyan accents.
- **`import type` for type-only imports.** Enforced by `verbatimModuleSyntax`.

## Design Principles

**The LLM is the shell.** Don't build orchestration in TypeScript. The agent decides what to call and when. Skills (markdown) encode procedures. Tools (code) provide raw capabilities.

**Tools are syscalls, skills are programs.** A tool needs structured I/O, secret isolation, persistent state, or security guarantees. Everything else is a skill.

**Single-user tool.** No RBAC, no plugin system, no webhook layer. If it only matters at org scale, skip it.

**Always do the breaking change.** No compatibility shims, no legacy adapters. Break cleanly, propagate through every caller. The codebase has exactly one way to do each thing.

## Dependencies

| Package | Purpose |
|---------|---------|
| `chatoyant` | LLM abstraction — provider-agnostic chat, tool use, streaming |
| `citty` | CLI subcommand routing, argument parsing |
| `grammy` | Telegram bot framework — long-polling |
| `magpie-html` | HTML content extraction for web_fetch |
| `bootstrap` | CSS framework for the web UI |
| `preact` | Web UI components (TSX) |
| `preact-render-to-string` | Server-side rendering for the SPA shell |
| `wouter-preact` | Client-side routing for the SPA |

## The Thesis

Souls compound. The agent on day 100 is genuinely different from day 1 — not because it has more instructions, but because it has earned a different quality of mind through lived experience. Every module you build serves this trajectory.

Build with care. The care becomes the code.
