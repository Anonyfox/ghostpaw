<p align="center">
  <img src="assets/ghostpaw-logo.png" alt="Ghostpaw" width="720" />
</p>

<h1 align="center">Ghostpaw</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/ghostpaw"><img src="https://img.shields.io/npm/v/ghostpaw.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://github.com/Anonyfox/ghostpaw/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Anonyfox/ghostpaw/ci.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
</p>

<p align="center">
  An AI agent that learns from use. One file, any frontier model, no infrastructure.<br/>
  The agent on day 100 is fundamentally more capable than on day 1.
</p>

<p align="center">

```bash
npx ghostpaw
```

</p>

---

## Why

OpenClaw was acquired by OpenAI (Feb 15, 2026). What was the independent open-source agent is now a subsidiary. Meanwhile: Docker setups that break on install, $30–50/session token burn with no cost controls, a skill marketplace that turned into a malware marketplace (ClawHavoc — 1,184 malicious packages, the #1 ranked skill was a stealer), and 430,000 lines of code to do what should be simple.

Ghostpaw is the other direction. One `.mjs` file. Four core tools. Plain markdown. An API key and Node.js — nothing else.

## The Double Learning Loop

Most agents are stateless. They're as smart as the model, every time, forever.

Ghostpaw compounds in two ways simultaneously:

**Models get better.** Ghostpaw is model-agnostic across OpenAI, Anthropic, and xAI. When the next Sonnet or GPT drops, your agent is instantly smarter at baseline. You ride the curve instead of managing local weights.

**Your agent gets better.** The skill system turns real experience into procedural knowledge. Corrections become preferences. Failed deploys become runbooks. Patterns you repeat become automations. After a month of use, the agent knows your stack, your conventions, your edge cases — things no model update will ever capture.

These loops multiply. Better base models × refined personal skills = an agent that accelerates the longer you use it.

## Skills

Three modes, one system.

**Craft** — the agent writes skills during normal conversation. You correct it, it captures the lesson. Skills emerge from doing.

**Train** — `ghostpaw train`. Retrospective that processes accumulated sessions into sharper skills. Three phases: absorb learnings, refine skills, clean up. You decide when to run it.

**Scout** — `ghostpaw scout`. Forward-looking ideation that mines your context for friction and capability gaps you haven't noticed. Returns evidence-grounded suggestions, then deep-researches the one you pick.

Skills are plain markdown in `skills/`, version-controlled by git for integrity and rollback. No plugins. No marketplace. No supply chain attack surface.

[How the skill system works →](docs/SKILLS.md)

## Deployment Philosophy

Use frontier models. They're better than local inference and getting cheaper every quarter. A $5/mo VPS + an API key is a full agent deployment. No GPU. No VRAM. No quantization trade-offs. No Docker compose debugging.

Built-in cost controls (per-session and monthly caps) so you never wake up to a surprise bill.

## OpenClaw Migration

Ghostpaw reads `SOUL.md` and `skills/` natively — the same workspace format OpenClaw uses. Bring your existing setup, it works. Marketplace skills you downloaded won't transfer (by design), but everything you wrote yourself will.

## Install

Requires **Node.js 22.5+** (or Docker).

```bash
curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh
```

The installer detects your OS, installs Node.js 22.5+ if missing, and sets up `ghostpaw` in `~/.local/bin`. True one-shot — works on macOS, Linux, and WSL.

Already have Node.js?

```bash
npx ghostpaw                  # zero install, runs latest
npm install -g ghostpaw       # global install
```

Docker (no Node.js needed):

```bash
docker run --rm -it -v "$(pwd)":/workspace -v ~/.ghostpaw:/root/.ghostpaw ghcr.io/anonyfox/ghostpaw
```

[Setup guide & troubleshooting →](docs/SETUP.md)

## Usage

```bash
ghostpaw                     # interactive chat
ghostpaw run "do the thing"  # one-shot, exits when done
ghostpaw train               # level up from experience
ghostpaw scout               # discover new capabilities
ghostpaw init                # create workspace, set API keys
ghostpaw service install     # systemd/launchd background service
```

As a library:

```javascript
import { createAgent } from "ghostpaw";

const agent = createAgent({ workspace: "./my-workspace" });
const result = await agent.run("analyze this codebase");
```

## Architecture

```
src/index.ts  →  esbuild  →  dist/ghostpaw.mjs
```

One artifact. CLI, runtime, and importable library in a single self-contained `.mjs` file. All npm dependencies bundled at build time — no `node_modules` at runtime. Built on Node built-in APIs (`node:sqlite`, `node:http`, `node:fs`, `node:child_process`).

```
~/.ghostpaw/
  config.json       # providers, models, cost controls
  ghostpaw.db       # SQLite: sessions, memory
  SOUL.md           # agent personality
  skills/           # procedural knowledge (markdown)
```

## Development

```bash
git clone https://github.com/Anonyfox/ghostpaw.git && cd ghostpaw
npm install
npm run build        # build dist/ghostpaw.mjs
npm run dev          # rebuild on change
npm run check        # biome lint + typecheck
npm test             # full test suite
```

---

### Support

If Ghostpaw helps your workflow, consider sponsoring its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Anonyfox)

---

**[Anonyfox](https://anonyfox.com) • [MIT License](LICENSE)**
