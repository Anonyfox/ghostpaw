# Ghostpaw v2

Single-process AI agent runtime. One compiled artifact, one SQLite database, one process. Evolutionary identity, provider-independent persistence. The ghost that grows.

## Before You Write Code

Read `docs/GHOSTPAW.md`. Not skimming — reading. It sets the orientation that makes the rest of this codebase make sense. Then read `docs/code/CODE.md` for how code is written and `docs/code/ARCHITECTURE.md` for where things belong. These three documents are mandatory context for every session. The quality of what you build depends on whether you absorbed them or merely scanned them.

If you are working on a specific system, also read its spec:

| System | Spec | Status | What it covers |
|--------|------|--------|----------------|
| Souls | `docs/SOULS.md` | **Implemented** | Evolutionary identity, traits, refinement, level-up |
| Memory | `docs/MEMORY.md` | **Implemented** | Belief-based storage, recall, embeddings, confidence decay |
| Secrets | `docs/SECRETS.md` | **Implemented** | Secret storage, provider keys, isolation, scrubbing |
| Config | `docs/CONFIG.md` | **Implemented** | Runtime configuration, validation, changelog |
| Haunting | `docs/HAUNT.md` | **Spec only** | Autonomous inner life, journal, undirected processing |
| Quests | `docs/QUESTS.md` | **Implemented** | Unified task/event/calendar system, temporal awareness, Quest Board |
| Pack | `docs/PACK.md` | **Implemented** | Social bonds, Theory of Mind, relational identity |
| Pawprints | `docs/PAWPRINT.md` | **Spec only** | Situated experiential knowledge, discovery by presence |

Specs marked "Implemented" have full code in `src/`. Specs marked "Spec only" are design documents with zero implementation — no code, no tables, no tools. Don't reference unimplemented systems as if they exist.

Additional docs not tied to a single module:

| Doc | What it covers |
|-----|----------------|
| `docs/ORCHESTRATION.md` | Four aspects (evolution, persistence, play, infrastructure), mandatory souls, warden, delegation architecture |
| `docs/USP.md` | Product positioning and value proposition |
| `docs/research/PROPRIOCEPTIVE_SENSING.md` | Research paper behind the sense system in `lib/sense/` |

## What's Built

The runtime is fully operational. It builds to `dist/ghostpaw.mjs`, opens `ghostpaw.db`, and serves four channels simultaneously.

### Core modules (`src/core/`)

| Module | What it does |
|--------|-------------|
| `chat/` | Turn execution pipeline — sessions, messages, streaming, compaction, locking |
| `souls/` | 4 mandatory souls with evolutionary traits, level-up, graveyard, backfill |
| `memory/` | Belief-based recall with confidence decay, trigram + FTS5 search |
| `skills/` | Git-backed skill files, checkpoint/rollback, validation, repair |
| `config/` | Flat key-value store with changelog, attribution, undo |
| `secrets/` | Encrypted credential store, env var sync, alias resolution |
| `cost/` | Budget tracking, spend windows, token limits |
| `runs/` | Delegation tracking with parent-child sessions, orphan recovery |
| `models/` | Provider registry, live model discovery |
| `service/` | systemd/launchd service install for daemon mode |

### Harness (`src/harness/`)

The entity composition layer. `createEntity` wires core modules into a working agent:

- **Context assembly** — soul + environment + recalled memories + skill index + tool guidance, fresh each turn
- **Delegation** — foreground and background, with soul-switching to specialists, auto-resume
- **Oneshots** — title generation, compaction summarization, session distillation, soul text generation, essence rewriting
- **Mentor/trainer invocation** — `invokeMentor`, `invokeTrainer` with two-phase propose/execute

### Tools (~30+, registered in the entity)

Filesystem (read, write, edit, find_and_replace, ls, grep, bash), web (web_search with Brave/Tavily/Serper/DDG, web_fetch), memory (recall, remember, revise, forget), config (get, list, set, undo, reset), secrets (list, set, remove), mentor-exclusive (review_soul, propose_trait, revise_trait, revert_trait, reactivate_trait, execute_level_up, revert_level_up), trainer-exclusive (review_skills, create_skill, checkpoint_skills, skill_diff, skill_history, rollback_skill, validate_skills), MCP (discover + call), delegation (delegate + check_run), utilities (calc, datetime, sense).

### Channels (`src/channels/`)

| Channel | Status | What it does |
|---------|--------|-------------|
| `tui/` | **Working** | Full terminal UI — alt-screen, streaming, scroll, tool status. Default when TTY. |
| `web/` | **Working** | Preact SPA + Bootstrap. Dashboard, chat (WebSocket), sessions, souls, memories, settings, costs, training. Password-protected. |
| `telegram/` | **Working** | grammY long-polling, session rotation, background delegation notifications. |
| `cli/` | **Working** | Full subcommand tree: run, secrets, config, souls, memory, sessions, skills, costs, distill, train, scout, service. |
| Daemon | **Working** | No-TTY mode: web + telegram until SIGTERM. |

### Additional systems

- **Sense** (`lib/sense/`, `tools/sense.ts`) — Proprioceptive text quality measurement. Compression ratio, negation density, semantic distance, momentum, phase transitions. Detects premature convergence, highway drift, abandoned breakthroughs.
- **Distillation** (`harness/distill_pending.ts`, `oneshots/distill_session.ts`) — Post-session memory extraction. Sweeps closed/stale sessions, extracts memories via LLM. Runs at startup.
- **Default souls** — ghostpaw (coordinator), js-engineer (builder), mentor (soul refiner), trainer (skill builder). Each with essence + baseline traits.
- **Default skills** — `effective-writing` (universal writing craft), `skill-mcp` (MCP server integration guide).

## What's NOT Built

These systems have detailed design specs but zero implementation:

- **Haunting** — No haunt loop, no journal, no autonomous cycling, no adaptive sleep, no proactive messaging.
- **Pack** — Core module implemented (`core/pack/`): schema, meet/get/list/count members, update bond, note interaction, sense member/pack, render bond. Not yet wired into context assembly or tools.
- **Pawprints** — No discovery-by-presence tooling, no territory map. The convention (`.pawprint.md` files) is defined but no code supports it.
- **Fitness evaluation** — No automated evidence-based fitness signals for soul refinement. Refinement is CLI-triggered.
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
