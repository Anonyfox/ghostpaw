# Contributing

## Setup

```bash
node --version  # must be >= 24
npm install
npm run check   # lint + typecheck — must pass
npm run build   # produces dist/ghostpaw.mjs
```

## Rules

- **Single self-contained artifact.** Everything ships bundled in one `.mjs` file — no `node_modules` at runtime. npm dependencies are fine as long as esbuild can bundle them. Prefer Node built-in APIs where practical, use good npm packages where they earn their keep.
- **Biome for all formatting and linting.** Run `npm run lint:fix` before committing. CI enforces this.
- **TypeScript strict mode.** No `any` without justification. Use `import type` for type-only imports.
- **ESM only.** No CommonJS, no interop hacks.
- **Node 24+.** Native TypeScript type stripping. `node:sqlite` available without flags.
- **`node:sqlite` is always dynamically imported** (`await import('node:sqlite')`), never static.

See [AGENTS.md](AGENTS.md) and [docs/code/CODE.md](docs/code/CODE.md) for the full coding conventions and design philosophy.

## Structure

Five layers, strictly ordered. Higher depends on lower. Never reverse.

```
src/
  channels/          # user-facing — telegram, web, cli, tui
  harness/           # entity composition, context assembly, oneshots
  tools/             # agent syscalls — what the LLM can call
  core/              # domain logic — one subfolder per feature
  lib/               # pure utilities — domain-independent
```

Everything in `src/` compiles into one file via esbuild. The build script is `build.mjs`.

## Commits

- Keep commits atomic. One concern per commit.
- Write what changed and why, not how.

## Pull Requests

- Reference an issue if one exists.
- Ensure `npm run check` passes.
- Keep PRs focused. Prefer several small PRs over one large one.
