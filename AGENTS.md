# Ghostpaw — Agent Guide

Single-file AI agent runtime. Spectral wolf, not a bloated beast. One `.mjs` artifact, one SQLite database, one process. The name is Ghost Wolf (WoW Shaman) meets Open**Claw** — fast, ethereal, independent, leaves only pawprints.

## Architecture

```
src/index.ts  →  esbuild  →  dist/ghostpaw.mjs
```

Three layers, never crossed:

- **SQLite** — all mutable state (sessions, messages, memory, runs, secrets, logs). One file: `ghostpaw.db`.
- **Markdown** — all behavior (SOUL.md, skills/, agents/). Human-readable, agent-writable, git-versionable.
- **Kernel** — the compiled `.mjs`. Tools, agent loop, provider abstraction. Immutable at runtime.

Five bundled deps: `chatoyant` (LLM abstraction), `magpie-html` (HTML extraction), `grammY` (Telegram), `marked` (markdown rendering), `bootstrap` (web UI CSS). Everything else is `node:*` built-ins. Node 22.5+ only.

## Source Layout

```
src/
  index.ts          CLI + library exports + createAgent factory
  core/             Agent loop, sessions, memory, context, cost, training pipeline
  tools/            Built-in tools (grep, ls, read, write, edit, bash, web, memory, delegate, mcp, ...)
  lib/              Shared utilities (embeddings, vectors, diff, workspace, errors, terminal)
  mcp/              Native MCP client (JSON-RPC, stdio + HTTP transports)
  channels/         Channel adapters (Telegram) and ChannelRuntime
  web/              Built-in web control plane (auth, router, API routes, embedded SPA)
```

Every tool has a matching `.test.ts`. Tests run via `node --test`.

## Design Rules

**The LLM is the shell.** Don't build orchestration in TypeScript. The LLM decides what to call and when. Skills (markdown) encode procedures. Tools (code) provide raw capabilities.

**Tools are syscalls, skills are programs.** A new tool is only justified when it needs structured I/O bash can't provide, secret isolation, in-process persistent state, or reliability/security guarantees. Everything else is a skill.

**Don't go enterprisey.** Single-user tool. No RBAC, no REST API in core, no plugin system, no webhook layer. If it only matters at org scale, skip it.

## Coding Conventions

- **ESM only.** No CJS, no interop. Imports use `.js` extensions (TypeScript convention for NodeNext).
- **TypeScript strict mode.** No `any` without justification. Use `import type` for type-only imports (`verbatimModuleSyntax`).
- **Biome** for formatting and linting. 2-space indent, double quotes, trailing commas, semicolons, 100-char line width.
- **Node built-in APIs** prefixed with `node:` protocol (`node:fs`, `node:path`, `node:sqlite`).
- **`node:sqlite` is always dynamically imported** — never static. The self-re-exec bootstrap for `--experimental-sqlite` depends on this.
- **No emoji in terminal output.** Cargo/esbuild-style: labeled lines, dim secondary info, cyan accents. Functional beauty.
- **Tests** live next to source (`foo.ts` → `foo.test.ts`). Use `node:test` and `node:assert`.

## Tool Boundary Checklist

Before adding a tool, verify at least one:

1. Structured I/O that bash can't provide reliably
2. Secret isolation (values must never enter conversation)
3. In-process state that persists across calls
4. Reliability/security bash can't guarantee

If none apply → write a skill.

## The Vibe

Ghostpaw is a spectral wolf — fast, lean, independent. Cyan energy, glowing pawprints, no dead weight. The terminal output is clean and minimal. The codebase is the same: small surface area, sharp edges, nothing decorative. Every line earns its place.

Skills compound. The agent on day 100 is better than day 1. That's the thesis — don't dilute it.
