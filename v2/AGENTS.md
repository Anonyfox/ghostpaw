# Ghostpaw v2

Single-process AI agent runtime. One compiled artifact, one SQLite database, one process. Evolutionary identity, autonomous inner life, provider-independent persistence. The ghost that grows.

## Before You Write Code

Read `docs/GHOSTPAW.md`. Not skimming — reading. It sets the orientation that makes the rest of this codebase make sense. Then read `docs/code/CODE.md` for how code is written and `docs/code/ARCHITECTURE.md` for where things belong. These three documents are mandatory context for every session. The quality of what you build depends on whether you absorbed them or merely scanned them.

If you are working on a specific system, also read its spec:

| System | Spec | What it covers |
|--------|------|----------------|
| Souls | `docs/SOULS.md` | Evolutionary identity, traits, refinement, level-up |
| Memory | `docs/MEMORY.md` | Storage, recall, embeddings, reconciliation |
| Haunting | `docs/HAUNT.md` | Autonomous inner life, journal, undirected processing |
| Secrets | `docs/SECRETS.md` | Secret storage, provider keys, isolation |
| Config | `docs/CONFIG.md` | Runtime configuration, validation |

These are design documents. They define what each system does, how it works, and what decisions have already been made. Don't reinvent what's specified — implement it.

## Architecture

Five layers, strictly ordered. Higher depends on lower. Never reverse. Never sideways.

```
5.  agent.ts          composition root — wires everything
4.  channels/         telegram, web, cli, tui
3.  tools/            agent syscalls — what the LLM can call
2.  core/             domain logic — one subfolder per feature
1.  lib/              pure utilities — domain-independent
```

Each feature in `core/` owns its types, logic, default content, tests, and database tables. Tools call into core for domain operations. Channels drive the agent loop, never call tools directly.

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

## The Thesis

Souls compound. The agent on day 100 is genuinely different from day 1 — not because it has more instructions, but because it has earned a different quality of mind through lived experience. Every module you build serves this trajectory.

Build with care. The care becomes the code.
