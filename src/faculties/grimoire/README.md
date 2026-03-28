# Grimoire Faculty Retired

The local standalone rewrite for this faculty has been retired.

Grimoire work now lives in the dedicated external package and repository:

- repo: [GhostPawJS/grimoire](https://github.com/GhostPawJS/grimoire)
- package: `@ghostpaw/grimoire`

That package supersedes this local faculty rewrite and already carries the
standalone domain model, documentation, direct `read` / `write` / `network`
API, built-in `tools`, `skills`, `soul`, and the Spell Forge demo app.

## What the Package Implements

**Core engine** — spell discovery, chapter management, frontmatter parsing,
SKILL.md spec validation (AgentSkills standard), structural repair, inscription,
sealing, rollback, diff, history, rank/tier computation, resonance (time-weighted
honing readiness), note lifecycle (deposit, route, distill, expire, cap),
cataloguing (stale/dormant/oversized detection, seal velocity, spell health,
chapter balance, orphan clustering, draft surfacing), index building with
chapter filtering, tier-aware rendering.

**Triple storage** — filesystem (procedures as human-readable SKILL.md),
git (content-addressable versioning, rank derivation, rollback), SQLite
(lifecycle metadata: events, notes, catalogue snapshots, drafts, provenance,
registry index). Graceful degradation at every layer — works without SQLite,
without git, without network, without `tar`.

**Scouting pipeline** — source resolution (GitHub shorthand, URLs, deep paths,
AgentSkillHub slugs, local paths, generic git URLs), tarball download and
extraction, git clone fallback, managed staging with guaranteed cleanup,
`adoptSpell` / `adoptSpells` with provenance, multi-skill repo handling,
duplication guard, `scout` all-in-one convenience.

**Update reconciliation** — `checkUpdates` batch detection against upstream,
auto-apply for rank-1 spells (no local evolution), three-way reconciliation
surface for evolved spells (original import, current local, upstream new).

**Registry** — `searchSkills` against AgentSkillHub and GitHub code search,
`analyzeRepo` for previewing multi-skill repos, local `scout_index` SQLite
cache with `refreshIndex` and offline `searchIndex`.

**Provenance** — `spell_provenance` table tracking origin, source commit,
version, import/update timestamps. Dual storage in SQLite and frontmatter
metadata for portability. Updated on move, deleted on remove, preserved on
shelve.

**Spec validator** — `validateSkillMd`, `parseSkillMd`, `serializeSkillMd`.
Bidirectional frontmatter normalization (hyphenated on-disk ↔ camelCase API).
Called before every write operation.

**13 built-in skills** — hone-spell-from-evidence, inscribe-spells-correctly,
distill-notes-into-spells, evolve-spell-through-tiers,
decompose-oversized-spells, maintain-grimoire-health,
archive-and-prune-spells, reorganize-spell-chapters,
handle-edge-cases-gracefully, resolve-validation-failures,
search-and-retrieve-spells, scout-and-adopt-skills,
reconcile-upstream-updates.

**Trainer soul** — the dedicated craftsman soul for operating the grimoire,
with subliminal-coded essence covering training (backward), scouting (forward),
and adoption (outward).

**Spell Forge demo app** — Preact SPA with guild workshop aesthetic. Dashboard,
chapter library, spell cards with resonance glow, spell detail with seal
history, inscription flow, note inbox, catalogue view, scouting interface.

**Zero runtime dependencies.** Node.js built-in modules only (`fetch`, `fs`,
`path`, `os`, `child_process`, `crypto`). System utilities: `tar`
(macOS/Linux default), `git` (optional).

## Reintegration Note

When Ghostpaw is ready to plug procedural knowledge back in, it should wire it
back from `@ghostpaw/grimoire` directly instead of recreating a second internal
grimoire engine here.

The intended return path is:

- use Grimoire's direct `read`, `write`, and `network` surface as the source
  of truth for spells, chapters, seals, ranks, resonance, notes, drafts,
  provenance, scouting, and registry operations
- use thin Ghostpaw-side wrappers over Grimoire's exported `tools`, `skills`,
  and `soul` fragments instead of reauthoring parallel local surfaces
- rely on Grimoire's built-in derived mechanics for tier computation,
  resonance colors, note auto-routing, orphan clustering, spell health scores,
  seal velocity, chapter balance, duplication guard, spec validation, source
  resolution, managed staging, provenance tracking, and update reconciliation
- keep the same runtime assumptions: Node 24+, built-in `node:sqlite`, git on
  the system, lean local-first data model with triple storage (filesystem +
  git + SQLite)
- the trainer soul's tool surface (11 tools: review_skills, create_skill,
  checkpoint_skills, skill_diff, skill_history, rollback_skill,
  validate_skills, absorb_fragment, search_skills, scout_skill, skill_updates)
  maps directly to Grimoire's public API

Grimoire is heavily tested and intended to be the airtight standalone system of
record for this domain.

Once the remaining faculties are extracted similarly, Ghostpaw should consume
the external package instead of reviving a second local grimoire faculty copy
here.
