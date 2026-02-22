# Contributing

## Setup

```bash
node --version  # must be >= 22.5.0
npm install
npm run check   # lint + typecheck — must pass
npm run build   # produces dist/ghostpaw.mjs
```

## Rules

- **Single self-contained artifact.** Everything ships bundled in one `.mjs` file — no `node_modules` at runtime. npm dependencies are fine as long as esbuild can bundle them. Prefer Node built-in APIs where practical, use good npm packages where they earn their keep (channels, parsing, etc.).
- **Biome for all formatting and linting.** Run `npm run lint:fix` before committing. CI enforces this.
- **TypeScript strict mode.** No `any` without justification. Use `import type` for type-only imports.
- **ESM only.** No CommonJS, no interop hacks.
- **`node:sqlite` is always dynamically imported** (`await import('node:sqlite')`), never static. This keeps the self-re-exec bootstrap working.

## Structure

```
src/
  index.ts           # entry point: CLI + library exports
  core/              # agent loop, tools, sessions, context
  providers/         # LLM adapters (anthropic, openai, google)
  extensions/        # bundled extensions + loader
  channels/          # telegram, etc.
  ui/                # web control UI
  lib/               # shared utilities
```

Everything in `src/` compiles into one file via esbuild. The build script is `build.mjs`.

## Commits

- Keep commits atomic. One concern per commit.
- Write what changed and why, not how.

## Pull Requests

- Reference an issue if one exists.
- Ensure `npm run check` passes.
- Keep PRs focused. Prefer several small PRs over one large one.
