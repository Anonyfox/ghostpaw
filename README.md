<p align="center">
  <img src="https://github.com/Anonyfox/ghostpaw/blob/master/assets/ghostpaw-logo.png" alt="Ghostpaw" width="720" />
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

Ghostpaw is the other direction. One `.mjs` file. Six core tools. Plain markdown. An API key and Node.js — nothing else.

## Four Learning Loops

Most agents are stateless. They're as smart as the model, every time, forever. Ghostpaw stacks four compounding loops on top of each other.

**Loop 1 — Models get better.** This is the ChatGPT mode everyone knows. Ghostpaw is model-agnostic across OpenAI, Anthropic, and xAI. When the next Sonnet or GPT drops, your agent is instantly smarter at baseline. You ride the curve instead of managing local weights.

**Loop 2 — You teach it.** This is the OpenClaw and Claude Code mode. There's a wealth of skills, prompts, and workflows across the internet. Copy a deployment checklist into `skills/`, paste a coding convention, drop in a teammate's debugging playbook. Plain markdown — no marketplace needed, no approval process, no supply chain risk.

**Loop 3 — It refines its skills.** The agent extracts learnings from every session, sharpens its own procedures through training, and proactively scouts for capability gaps it hasn't been told about. Procedural knowledge that compounds from real experience.

**Loop 4 — It refines its cognition.** This is what no other tool does. Ghostpaw doesn't just learn *what* to do — it learns *how to think*. Agent souls (system prompts defining cognitive identity) evolve through evidence-driven refinement: delegation outcomes feed back into soul revisions, version-controlled by git with full rollback. The coordinator gets better at routing. Each specialist gets better at their domain. Research calls this [Agentic Context Engineering](https://arxiv.org/abs/2510.04618) — evolving prompts as playbooks. It's a +10% performance gain from prompt evolution alone.

These loops multiply. Better base models × curated knowledge × self-refined skills × evolving cognition = an agent that accelerates the longer you use it.

## Skills

Three modes, one system.

**Craft** — the agent writes skills during normal conversation. You correct it, it captures the lesson. Skills emerge from doing.

**Train** — `ghostpaw skills train`. Retrospective that processes accumulated sessions into sharper skills. Three phases: absorb learnings, refine skills, clean up. You decide when to run it.

**Stoke** — `ghostpaw skills stoke`. Forward-looking ideation that mines your context for friction and capability gaps you haven't noticed. Returns evidence-grounded suggestions, then deep-researches the one you pick.

Skills are plain markdown, version-controlled by git for integrity and rollback. No plugins. No marketplace. No supply chain attack surface.

## Souls

Skills teach the agent *what* to do. Souls teach it *how to think*. Every agent — the main coordinator and each specialist — has a soul: a markdown file defining its cognitive identity, judgment calls, and reasoning style.

Ghostpaw runs as a **coordinator with souled specialists**. The main soul routes tasks. Specialist souls define how each expert thinks — not just their role, but their cognitive mode. Six mandatory souls ship by default: ghostpaw (coordinator), js-engineer (builder), mentor (soul refiner), trainer (skill builder), warden (persistence keeper), chamberlain (infrastructure governor).

Souls improve through evidence-driven refinement: the system analyzes delegation outcomes and memories, proposes focused changes, and tracks revisions with full rollback. The soul's **level** reflects how many times it has been refined from real-world evidence. This is [Loop 4](#four-learning-loops) — the cognition loop that makes the agent think better over time, not just know more.

## Memory

Persistent, local, automatic. The agent remembers corrections, preferences, and discoveries across sessions — and recalls them on its own when context matters.

Memories are stored in SQLite (Node.js built-in), embedded using a lightweight trigram hash (no API calls, no model downloads), and searched by meaning with a recency bias so recent corrections outrank stale context. No vector database. No cloud sync. Your memories stay on your machine, in one file.

The agent uses memory transparently: ask "what concerts are near me?" and it already knows your city, your bands, your preferences — because it recalled them before drafting its answer.

Memory is belief-based with confidence decay — recent corrections outrank stale context naturally.

## Web Tools

Built-in `web_search` and `web_fetch` — no browser, no Playwright, no headless Chrome. The agent searches, reads pages, and synthesizes on its own.

Search works out of the box with DuckDuckGo. Add an API key for **Brave Search**, **Tavily**, or **Serper** and the agent automatically upgrades to the premium provider. Fetch extracts clean content in four modes: article (readable body), text (full plaintext), metadata (links + feeds), and html (raw source). Large pages spill to disk with a preview — the agent reads sections on demand instead of burning context.

That's the zero-dependency core. Since the agent has shell access and learns through skills, nothing stops it from driving Playwright, puppeteer, or `curl` pipelines if they're installed — you teach it once, it writes a skill, and the capability sticks. The built-in tools cover 95% of web tasks without any of that.

API keys are managed via `ghostpaw secrets` — stored locally, never sent to the LLM.

## Communication

Talk to Ghostpaw from anywhere. Channels are persistent messaging integrations that run alongside the REPL or as a headless daemon. Each channel gets its own session with full conversation history, sticky across restarts.

**Telegram** — create a bot via `@BotFather`, store the token with `ghostpaw secrets set TELEGRAM_BOT_TOKEN`, start Ghostpaw. Typing indicators, split replies, emoji read receipts. Under a minute to set up.

**Web UI** — built-in control plane at `localhost:3000`. Set a password, open a browser. Full chat with real-time streaming, live training, skill scouting, memory search, session inspection — from your phone or desktop. Password-authenticated, rate-limited, CSP-hardened. Everything embedded in the single `.mjs` artifact.

All channels run simultaneously — TUI, web, and Telegram from a single process.

## Cost Controls

Every LLM call is tracked with real provider-reported token counts and costs. Set a hard dollar limit on a rolling 24-hour window — the agent blocks itself before it overspends. A live dashboard in the web UI shows spend per model, per day, and how much budget remains. Adjust the limit in real time, no restart needed.

No surprise bills. No midnight-reset loopholes. No hope-based cost management.

Manage limits via `ghostpaw costs` or the web UI dashboard.

## Deployment Philosophy

Use frontier models. They're better than local inference and getting cheaper every quarter. A $5/mo VPS + an API key is a full agent deployment. No GPU. No VRAM. No quantization trade-offs. No Docker compose debugging.

## OpenClaw Migration

Ghostpaw reads `SOUL.md` and `skills/` natively — the same workspace format OpenClaw uses. Bring your existing setup, it works. Marketplace skills you downloaded won't transfer (by design), but everything you wrote yourself will.

## Install

Requires **Node.js 24+** (or Docker).

```bash
curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh
```

The installer detects your OS, installs Node.js 24+ if missing, and sets up `ghostpaw` in `~/.local/bin`. True one-shot — works on macOS, Linux, and WSL.

Already have Node.js?

```bash
npx ghostpaw                  # zero install, runs latest
npm install -g ghostpaw       # global install
```

Docker (no Node.js needed):

```bash
docker run --rm -it -v "$(pwd)":/workspace ghcr.io/anonyfox/ghostpaw
```

[Setup guide & troubleshooting →](docs/SETUP.md)

## Usage

```bash
ghostpaw                        # interactive chat (auto-setup on first run)
ghostpaw run "do the thing"     # one-shot, exits when done
ghostpaw skills train           # level up from experience
ghostpaw skills stoke           # discover new capabilities
ghostpaw secrets                # manage API keys
ghostpaw souls                  # inspect and refine souls
ghostpaw memory                 # browse memories
ghostpaw quests                 # tasks, events, deadlines
ghostpaw service install        # systemd/launchd background service
```

## Architecture

```
src/index.ts  →  esbuild  →  dist/ghostpaw.mjs
```

One artifact. Single self-contained `.mjs` file with embedded web UI. All npm dependencies bundled at build time — no `node_modules` at runtime. Built on Node built-in APIs (`node:sqlite`, `node:http`, `node:fs`, `node:child_process`).

Five layers: `lib/` (utilities) → `core/` (domain logic) → `tools/` (agent syscalls) → `harness/` (entity composition) → `channels/` (TUI, web, Telegram, CLI).

```
./                            # workspace directory
  ghostpaw.db                 # SQLite: sessions, memory, souls, pack, quests, config, secrets
  skills/                     # procedural knowledge (markdown, git-versioned)
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
