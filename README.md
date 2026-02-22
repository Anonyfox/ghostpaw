# Ghostpaw

Single-file AI agent runtime. TypeScript → one `.mjs` file. Self-contained. Node 22.5+ only.

```bash
npx ghostpaw
```

## What

- **One artifact** — `ghostpaw.mjs` is the CLI, runtime, and importable library
- **4 core tools** — Read, Write, Edit, Bash. Everything else is an extension.
- **3 LLM providers** — OpenAI, Anthropic, xAI. Normalized streaming interface.
- **SQLite for state** — sessions, memory, logs. One file: `ghostpaw.db`
- **Self-extending** — the agent writes its own extensions at runtime
- **OpenClaw-compatible** — reads SOUL.md / SKILL.md natively

## Why

OpenClaw was acquired by OpenAI (Feb 15, 2026). The independent alternative doesn't exist yet. This is it.

## Install

Requires **Node.js 22.5+** (or Docker).

```bash
npx ghostpaw                  # zero install, runs latest from npm
npm install -g ghostpaw       # permanent global install
curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh  # standalone
```

**Docker** (no Node.js needed):

```bash
docker run --rm -it -v "$(pwd)":/workspace -v ~/.ghostpaw:/root/.ghostpaw ghcr.io/anonyfox/ghostpaw
```

See [docs/SETUP.md](docs/SETUP.md) for detailed instructions and troubleshooting.

## Usage

**CLI:**

```bash
ghostpaw                     # interactive chat
ghostpaw serve               # web UI + API
ghostpaw run "do the thing"  # one-shot, exits when done
ghostpaw init                # create workspace, set API keys
ghostpaw telegram            # Telegram bot
```

**Library:**

```javascript
import { createAgent } from "ghostpaw";

const agent = createAgent({ workspace: "./my-workspace" });
const result = await agent.run("analyze this codebase");
```

Requires `--experimental-sqlite` when used as a library. The CLI handles this automatically.

## Architecture

```
src/index.ts  →  esbuild  →  dist/ghostpaw.mjs  (single ESM artifact)
```

All npm dependencies are bundled by esbuild at build time. The output is a single self-contained `.mjs` file — no `node_modules` needed at runtime. Uses Node built-in APIs (`node:sqlite`, `node:http`, `node:fs`, `node:child_process`, `node:test`, `fetch()`) plus carefully chosen npm packages for channels, parsing, etc.

Workspace at `~/.ghostpaw/`:

```
config.json       # providers, models, cost controls
ghostpaw.db       # SQLite: sessions, messages, memory
SOUL.md           # agent personality
skills/           # SKILL.md files (prompt context)
extensions/       # JS modules (hot-reloaded)
```

## Development

```bash
git clone https://github.com/Anonyfox/ghostpaw.git
cd ghostpaw
npm install
npm run build        # build dist/ghostpaw.mjs
npm run dev          # rebuild on change
npm run check        # biome lint + typecheck
npm run start        # run the built artifact
```

## Status

Early development. Core architecture is in place. Features are being built.

## License

MIT
