# Pawprints

A wolf leaves marks in the ground, not in its head. Other wolves — or the same wolf later — find the marks by visiting the location. The knowledge is in the environment, not the animal.

Ghostpaw works the same way. As it works through directories, reads files, solves problems, it leaves small situated knowledge files — **pawprints** — right there in the filesystem. When the ghost (or a different ghost entirely) visits that location again, it discovers the pawprint and immediately knows things it would otherwise have to rediscover from scratch.

This is fundamentally different from memory. Memory is internal (SQLite), searched by meaning, and stays with the ghost. Pawprints are external (plain files), discovered by location, and stay with the *workspace*. They travel via git. They accumulate across ghosts. The workspace itself gets smarter over time.

## What a Pawprint Is

A pawprint is a markdown file named `.pawprint.md` that can appear in any directory, anywhere in the filesystem. It contains situated knowledge — things the ghost discovered about this specific location that might be useful to anyone (ghost or human) who works here.

```
project/
  src/
    api/
      .pawprint.md   ← "JWT refresh has a race condition around line 45.
                          Rate limiter silently drops headers above 100 req/s."
      auth.ts
      routes.ts
  deploy/
    .pawprint.md     ← "Migrations must run before app container starts.
                          Prod read replica is ~30s behind primary."
    docker-compose.yml
```

Pawprints are NOT documentation. Documentation is prescriptive — "how to use this." Pawprints are experiential — "what I discovered about this." The gotchas, the quirks, the "this looks simple but actually..." warnings that never make it into READMEs.

Think of them as the difference between a map (documentation) and scent marks (pawprints). The map tells you the terrain. The marks tell you what a wolf who was *actually here* learned the hard way.

## Why Not Just Memory

Memory and pawprints serve different purposes and neither replaces the other:

```
             Memory                  Pawprints
─────────────────────────────────────────────────
Storage      SQLite (internal)       Files (external)
Found by     Semantic search         Location (being there)
Scope        Global facts            Situated in a place
Transfers    Stays with the ghost    Travels with the workspace
Created by   One ghost               Any ghost, accumulates
Examples     "User prefers tabs"     "This parser has a subtle
             "Deploy uses port 80"    bug with nested arrays"
```

Memory answers "what does the ghost know?" Pawprints answer "what does this *place* know?"

You can wipe the ghost's database and start a fresh instance. If the workspace has pawprints, the new ghost immediately inherits situated knowledge left by the previous one. The knowledge survived because it lives in the filesystem, not in the ghost.

## Where Pawprints Live

Pawprints can appear anywhere. The ghost doesn't control where they exist — they're just files. Some naturally useful locations:

**Inside git repositories.** A `.pawprint.md` in `src/api/` might note that the auth module has a known race condition, or that the test suite needs a running Redis instance. These travel with the code. Fork the repo, inherit the ghost knowledge.

**In project root directories.** High-level project knowledge: "this is a monorepo, the API lives in `packages/api`, the shared types are in `packages/common`." Orients a ghost (or human) immediately.

**In OS-specific locations.** `/usr/local/.pawprint.md` noting "this machine uses the ARM homebrew path at /opt/homebrew, not the legacy /usr/local." Or `~/.ssh/.pawprint.md` noting "the ed25519 key is for GitHub, the RSA key is for the legacy deploy server."

**In data directories.** `~/Documents/invoices/.pawprint.md` noting "2024 invoices use the old format (CSV), 2025+ are JSON. The tax ID changed in March 2025."

**In config directories.** `~/.config/ghostpaw/.pawprint.md` with meta-knowledge about the ghost's own configuration.

The point: pawprints are filesystem-native. No special infrastructure. No database. No sync service. Just `.pawprint.md` files sitting in directories, readable by anything.

## How Tools Become Aware

Every built-in tool that touches the filesystem checks for pawprints as a side effect. Not forced — nudged. The ghost sees the pawprint in its tool output and naturally incorporates the knowledge.

**`ls`** — when listing a directory, if `.pawprint.md` exists, append a one-line indicator: `[pawprint present]`. The ghost knows there's situated knowledge here and can read it if relevant.

**`read`** — when reading a file, check the parent directory for `.pawprint.md`. If found, include a brief note in the output: `[pawprint: this directory has situated notes — read .pawprint.md for context]`. The ghost decides whether to follow up.

**`grep`** — when searching and finding matches, note if any result directory contains a `.pawprint.md`. Helps the ghost understand the context of search hits.

**`bash`** — when running commands in a directory, the working directory's pawprint (if any) can inform the ghost's understanding of the environment.

The key principle: **passive discovery, active choice.** Tools surface the *existence* of pawprints. The ghost decides whether to read them. This avoids context bloat — a deep `ls` through 50 directories doesn't dump 50 pawprints into context. It just notes where they exist, and the ghost reads the relevant ones.

## How Pawprints Get Created

Two paths, both converging to the same thing: a `.pawprint.md` file in a directory.

**Ghost-initiated.** During normal work, the ghost discovers something notable about a location — a quirk, a pattern, a warning. It writes or updates the `.pawprint.md` using the standard `write` or `edit` tool. The system prompt encourages this: "when you discover situated knowledge that would help a future visitor to this directory, leave a pawprint."

**Human-initiated.** You can write a `.pawprint.md` yourself. Drop one in your project root with setup notes. Put one in `/etc/nginx/` with your server's specific configuration quirks. The ghost reads them like any other pawprint — the source doesn't matter, only the location.

The ghost updates existing pawprints as it learns more. A pawprint isn't a one-time snapshot — it evolves. If the ghost fixes the race condition noted in a pawprint, it updates the pawprint to reflect the fix. If a quirk turns out to be wrong, the ghost corrects it.

## What Goes Into a Pawprint

Pawprints are freeform markdown, but good ones share common traits:

**Situated, not general.** "This specific auth module has a JWT race condition" — not "JWT implementations can have race conditions." General knowledge belongs in skills. Pawprints are about *this place*.

**Experiential, not prescriptive.** "I discovered that tests fail without Redis running" — not "always start Redis before testing." The ghost or human reading the pawprint draws their own conclusions.

**Concise.** A pawprint should be a few paragraphs at most. It's a quick heads-up, not a manual. If it's growing past a page, the knowledge probably belongs in a skill or documentation instead.

**Time-aware.** When relevant, note when something was discovered: "as of Feb 2026, the API returns v2 format." This lets future readers assess staleness.

Good pawprints feel like sticky notes left by a thoughtful colleague:

```markdown
# src/api/

- The `parseConfig` function silently swallows errors for missing
  optional fields. This is intentional — don't add strict validation
  without checking the 14 callers that rely on this behavior.

- Rate limiting kicks in at 100 req/s per IP but the docs say 1000.
  The nginx config overrides the app-level setting. Found this the
  hard way during load testing (Feb 2026).

- Test suite needs Redis running on default port. No env var override
  yet — it's hardcoded in `test/setup.ts:12`.
```

## Collective Intelligence

This is where pawprints become more than just notes. When multiple ghosts work on the same codebase (team members, each with their own Ghostpaw), pawprints accumulate collectively.

Ghost A works on the API layer, leaves pawprints about auth quirks and rate limiting gotchas. Ghost B works on the frontend, leaves pawprints about build configuration and browser-specific workarounds. Ghost C does infrastructure, leaves pawprints about deployment sequencing and environment differences.

A new team member's ghost clones the repo and immediately inherits the situated knowledge of all three ghosts. Not generic documentation (which is always incomplete and often stale) — the lived experience of ghosts who actually worked here.

The stigmergy research supports this quantitatively. A December 2025 study on decentralized multi-agent systems ([arXiv:2512.10166](https://arxiv.org/abs/2512.10166)) found that environmental traces — marks left in the shared environment — **outperform individual agent memory by 36-41%** on composite metrics above a critical agent density threshold (roughly 0.2+ agents per unit area). Below that threshold, individual memory dominates. Above it, the collective traces are significantly more powerful.

The critical finding: environmental traces alone, without cognitive infrastructure to interpret them, fail completely. A dumb agent can't use marks left by a smart agent. But a smart agent (with its own memory, skills, and reasoning) benefits enormously from marks left by other smart agents.

This maps directly to Ghostpaw: a ghost with memory, skills, and a soul can interpret pawprints and extract maximum value from them. The pawprint is just a markdown file — the intelligence is in the ghost that reads it.

## Research Backing

Several lines of research converge to support the pawprint concept:

### Stigmergy (indirect coordination through environmental traces)

The foundational concept. Originally observed in ant colonies where pheromone trails coordinate behavior without direct communication. A 2024 *Communications Engineering* study ([Nature](https://www.nature.com/articles/s44172-024-00175-7)) demonstrated that automatically designed stigmergy-based behaviors perform as well as or better than manually designed ones. The key property: agents coordinate through marks in the environment rather than explicit messaging.

Applied to LLM agents: the [Emergent Collective Memory](https://arxiv.org/abs/2512.10166) paper (Dec 2025) tested this directly with AI agents leaving persistent environmental traces encoding information about resources, hazards, and exploration patterns. Individual memory alone gave 68.7% improvement over baseline. But environmental traces above critical density gave an additional 36-41% improvement on top of that.

### BREW (Bootstrapping Experiential Environmental Knowledge)

[BREW](https://arxiv.org/abs/2511.20297) (Microsoft, submitted to ICLR 2026) optimizes agents through structured memory of environmental learning rather than weight optimization. Results: **10-20% improvement in task precision** and **10-15% reduction in API/tool calls** on real-world benchmarks (OSWorld, SpreadsheetBench). The key insight: environmental knowledge, structured and retrievable, is a powerful optimization substrate that doesn't require retraining.

### Grounding Files (AGENTS.md, CLAUDE.md, Cursor Rules)

The industry has already converged on a simpler version of this idea: static instruction files that give agents project-level context. AGENTS.md, CLAUDE.md, .cursorrules, and copilot-instructions are all variations of "put knowledge in the filesystem so agents find it." Research shows agents without grounding files break integrations, violate patterns, and produce inconsistent output. Agents with grounding files become dramatically more effective.

Pawprints generalize this pattern. Instead of one top-level instruction file, knowledge is distributed throughout the filesystem, attached to the specific locations where it matters. Instead of human-authored only, the ghost contributes its own situated observations. Instead of static, they evolve as the ghost learns more.

### Agent Trace (Cognition, 2026)

The [Agent Trace](https://cognition.ai/blog/agent-trace) open standard (backed by Cursor, Google Jules, Vercel, Cloudflare) records AI contributions alongside human authorship in version-controlled codebases. It creates "context graphs" — traces that preserve not just who changed the code, but the reasoning and decisions behind changes.

Pawprints complement this: Agent Trace records *what the ghost did*; pawprints record *what the ghost learned about the place*. Both travel with the code via git, but serve different purposes.

### Situated Cognition

The cognitive science perspective: knowledge isn't just "in the head" — it's distributed across the agent, its body, and its environment. Extensive enactivism ([Springer, 2025](https://link.springer.com/article/10.1007/s11229-025-04931-w)) argues that cognitive processes are "constituted by resources distributed across the brain, the body, and the environment under appropriate conditions." Research on embodied AI agents ([OpenReview, 2025](https://openreview.net/pdf/8d0266c8480b53121fe313cf5c69949104841387.pdf)) shows that agents leveraging situated environmental knowledge achieve more meaningful long-term interaction.

Pawprints are Ghostpaw's mechanism for situated cognition — knowledge in the environment rather than solely in the agent.

## Design Principles

**One file per directory.** Always `.pawprint.md`, always in the directory it describes. No nested pawprint trees, no index files, no database. Simple filesystem convention.

**Markdown, always.** Human-readable. Human-editable. Git-diffable. No binary format, no structured schema that might break. A ghost that can read markdown can read pawprints.

**Append-friendly, not fragile.** Multiple ghosts can add to the same pawprint. Git handles merge conflicts naturally. If two ghosts both discover something about the same directory, the merge produces a richer pawprint.

**Discoverable, not injected.** Tools hint at the existence of pawprints. The ghost decides whether to read them. No automatic context injection — that would balloon token usage in deep directory traversals.

**Not a substitute for anything.** Pawprints don't replace memory (global facts), skills (procedures), souls (judgment), or documentation (specs). They fill a specific gap: situated experiential knowledge attached to a location.

## The Dark Souls Parallel

The closest analog in existing design is Dark Souls' messaging system. Players leave constrained messages at specific locations in the game world. Other players discover them by being in the same location. Messages are:

- **Location-bound.** Attached to a specific place in the world, not stored in inventory.
- **Written by one, read by many.** Any player who visits the location sees the message.
- **Collectively rated.** Helpful messages get upvoted and persist longer. Unhelpful ones fade.
- **Anonymous.** You don't need to know who left it — only the content and location matter.
- **Constrained.** Fixed vocabulary prevents spam while enabling genuine communication.

This system, paradoxically, creates stronger community bonds than direct communication. The *indirectness* is the feature: "someone was here before me and left a warning" creates a sense of shared experience that direct chat doesn't.

Pawprints have the same quality. When a fresh ghost discovers a pawprint left by a previous ghost (or by a human), there's an implicit continuity: someone was here before, they learned something, they left it for you.

## Open Questions

**Staleness.** How do pawprints age? In ant colonies, pheromone trails evaporate — unused trails fade naturally. Pawprints in a filesystem don't evaporate. Should the ghost periodically review and prune stale entries? Should pawprints carry timestamps and be treated as lower-confidence after a threshold? Or is staleness self-correcting — the ghost reads an outdated pawprint, discovers it's wrong, and updates it?

**Scope boundaries.** Should pawprints outside the workspace (e.g., in `/etc/` or `~/`) be writable by the ghost? Should the ghost only write pawprints inside its workspace and read-only discover external ones? This has security implications.

**Gitignore.** Some teams might want pawprints committed (shared knowledge). Others might `.gitignore` them (local-only). Should Ghostpaw have an opinion, or leave this to the user?

**Density.** At what point do pawprints become noise? A directory with a 2-paragraph pawprint is helpful. A workspace where every directory has a 2-page pawprint is overhead. Should there be a soft size limit or a nudge toward conciseness?

**Interaction with `AGENTS.md` / `CLAUDE.md`.** These existing grounding files are a simpler version of the same idea. Pawprints generalize the pattern, but how do they coexist? Is a top-level `.pawprint.md` redundant with `AGENTS.md`? Should it be complementary (AGENTS.md = instructions, pawprint = experiential knowledge)?
