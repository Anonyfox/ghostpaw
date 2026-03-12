# Skills

> Every other system either never improves skills or auto-generates them without quality gates — the exact thing SkillsBench proved makes performance worse. Ghostpaw is the only one that resolves this: evidence-gated, human-curated, mechanically tiered, with fragment routing that prevents the redundancy drowning every marketplace. 15 refined skills beat 5,700 generic ones by +16pp.

An AI that uses the same tool the same way every time — regardless of whether it failed last Tuesday, succeeded differently yesterday, or watched you correct it three times this week — is not learning. It is improvising from scratch, every session, forever. Skills change that.

A skill is a written procedure. "How to deploy to Vercel with zero-downtime rollback." "How to write text that shapes thinking." Not a configuration setting, not a memory of what happened, not a personality trait — a step-by-step recipe for doing something well, born from real experience, refined through real use. Plain markdown. Human-readable. Git-versioned. Available to ghostpaw on demand. The concept maps to a universal experience: leveling a profession in WoW, watching an apprentice become a master, following a recipe that gets better every time you cook it. You start with a few basic procedures. You practice. They get sharper. The difference between a beginner and a master is not talent — it is the accumulated weight of refined procedures.

The research is unambiguous. [Curated skills raise pass rates by +16.2 percentage points](https://arxiv.org/abs/2602.12670) on average — effects so strong that a smaller model with skills beats a larger model without them. A single well-written procedure [substitutes for up to 100 execution examples](https://arxiv.org/abs/2511.07568). But [self-generated skills average -1.3pp](https://arxiv.org/abs/2602.12670) — models that autonomously author their own procedures make themselves *worse*. The difference between a helpful skill library and a self-sabotaging junk pile is curation quality. Every design decision in this system exists to land on the right side of that line.

Managed by the **Trainer** soul. The trainer reads work patterns, distills proven procedures into skills, creates new ones from user requests, coordinator observations, or stoke proposals, and maintains quality through validation, repair, and evidence-grounded refinement. Skills are ghostpaw's operational knowledge — the difference between improvising from scratch and executing from earned competence.

## What You Get

**Your procedures get better.** A deploy skill refined through 10 real encounters handles the environment variable edge case that tripped you up in week two, the rollback sequence that finally worked in week four, and the monitoring check that the historian flagged as a recurring friction signal. [Failure-driven skill evolution yields +7.3–12.1% improvement](https://arxiv.org/abs/2603.02766) over static skills that never change — and every refinement in ghostpaw comes from real evidence, not speculation. Training readiness tells you when a skill is ripe: orange means guaranteed improvement, grey means don't bother. You click train. You pick an improvement path from evidence-backed proposals. The procedure ghostpaw follows tomorrow is measurably sharper because of what you just did. Rank advances. `▲ deploy-vercel reached Journeyman (rank 3)!` — and Journeyman is not a badge. It means the skill is now composable as a dependency for other skills. At Expert, it enforces tool restrictions. At Master, it compiles to a token-efficient summary. Each tier changes what the system *does*.

**Ghostpaw notices what you don't say.** Three import corrections across two sessions — the coordinator creates a skill capturing the preference, without you asking. Quest completions drop reusable-pattern observations as fragments. Session consolidation captures workarounds. The historian flags friction signals during the nightly sweep. These observations accumulate silently in SQLite — and they route to existing skills before reflexively creating new ones. An [analysis of 40,285 agent skills](https://arxiv.org/abs/2603.04448) found "strong ecosystem homogeneity" from systems that create first and check later. Ghostpaw checks first. Most observations ARE refinements of what already exists. Only genuinely novel patterns — observations that cannot be absorbed by any existing skill — surface as proposals for new skills.

**Everything compounds silently.** The skill index sits in every soul's prompt — as skills sharpen, every conversation benefits. A coordinator with 30 refined skills navigates problems differently than one with 2. Writing quality improves because every soul reads the same effective-writing skill, and as that skill gets refined through training, all writing improves as a side effect. Fragments accumulate. Readiness colors shift from grey toward orange. [Power-law learning curves](https://www.nature.com/articles/s44260-025-00039-x) mean the first 5 checkpoints produce the steepest improvement — the rank system directs effort where the return is highest.

**The nightly forge runs itself.** Stoke — a builtin scheduled maintenance — validates every skill, expires stale fragments, computes readiness colors, detects dormant and oversized skills, routes fragments to their matching domains, and queues new-skill proposals from orphan clusters. Phase 1 is pure code: zero LLM tokens, under 100ms. Phase 2 fires only when meaningful evidence has accumulated — one bounded trainer call, ~$0.02. [OpenClaw's heartbeat burns $720+/month](https://openclawpulse.com/openclaw-api-cost-deep-dive/) in overhead, 60–80% wasted on "nothing to report." Stoke costs nothing when idle and less than a single chat message when active. You wake up to a reward menu: which skills are ready to train, what proposals queued overnight. Training is the reward moment, not a chore — the forge prepares the materials, you do the forging.

**The ecosystem is portable.** Skills are plain markdown folders with YAML frontmatter — the same format as [OpenClaw/AgentSkills](https://docs.openclaw.ai/skills) and the 5,700+ skills on ClawHub. Import a community skill as a starting point. But imported skills that aren't checkpointed yet are invisible — they must be validated and checkpointed to rank 1 before any soul sees them. The marketplace is a seedbed, not a supply chain. The skill that matters is the one refined through YOUR specific work — your deployment targets, your coding conventions, your failure modes.

**The rest of the system gets richer.** Quest completions drop skill fragments via `dropSkillFragment` — a decoupled message queue where quests are producers and the trainer is the consumer, never importing each other's code. The wisdom sweep reads `skill_health` to incorporate skill observations into the journal. The trainer uses `recall` to search memories for evidence during training, turning the warden's persistence into the skill system's evidence pool. [Skill-aware routing yields +22.5% performance](https://arxiv.org/abs/2602.19672) at 700x lower cost than RL-based alternatives — cheap routing with rich skills beats expensive orchestration with no skills.

## How It Works

### The Skill

Each skill lives in `skills/<name>/` with a mandatory `SKILL.md` entry point:

```
skills/
  deploy-vercel/
    SKILL.md           # Procedure + frontmatter
    scripts/           # Optional helper scripts
    references/        # Optional reference materials
  testing-strategy/
    SKILL.md
```

YAML frontmatter defines identity and constraints: `name`, `description`, `license`, `compatibility`, `allowedTools` (constrains which tools a soul may use when following this skill — at Expert tier, these restrictions activate), and `disableModelInvocation`. Naming is enforced: lowercase alphanumeric with hyphens only (`[a-z0-9]+(-[a-z0-9]+)*`). [Procedural APIs with artifacts yield +31.8% success and +54.3% task transfer](https://arxiv.org/abs/2504.07079) — the folder structure with scripts and references is not arbitrary organization, it is the representation that the research says works.

### The Index

Every soul sees a lightweight title index in its system prompt:

```
You have 7 skills. Read a skill's SKILL.md with the read tool when it's relevant.

- skills/deploy-vercel/: Deploy to Vercel with zero-downtime rollback
- skills/testing-strategy/: Testing patterns for TypeScript services
- skills/effective-writing/: The craft of writing text that shapes thinking
```

Cost: ~5 tokens per skill. 50 skills = ~250 tokens. Always present, always cacheable as part of the static system prompt. When a skill is relevant, the soul reads the full `SKILL.md` on demand — paying tokens only when the procedure is actually needed. This is the structural equivalent of [dynamic tool retrieval](https://arxiv.org/abs/2602.17046): a lightweight index for routing, full content loaded per-step only when matched. ITR measured 95% per-step token reduction and 32% routing improvement from this pattern. Anthropic's [Tool Search Tool](https://www.anthropic.com/engineering/advanced-tool-use) preserves up to 191,300 tokens versus loading all definitions upfront.

### Rank and Tiers

A skill's rank is its checkpoint count — the number of git commits touching that skill's folder. Not a quality score. Not a version number. An experience counter, because [the equal-odds rule](https://en.wikipedia.org/wiki/Equal-odds_rule) says volume of attempts predicts eminence, not per-attempt quality.

| Rank | Tier | What changes |
|------|------|--------------|
| 0 | Uncheckpointed | **Invisible.** Not in the skill index. No soul sees it. Only exists for raw imports that haven't been validated yet — every creation auto-checkpoints to rank 1. |
| 1–2 | Apprentice | **Visible.** Appears in the index. Souls can read and follow it. The starting point for every created skill. |
| 3–5 | Journeyman | **Composable.** Eligible as a dependency for other skills. Must include failure/recovery paths. |
| 6–9 | Expert | **Enforceable.** `allowedTools` restrictions activate — [per-tool privilege reduces attacks to 0%](https://arxiv.org/abs/2504.11703) while preserving utility. Must include edge cases and caveats. |
| 10+ | Master | **Compiled.** Compressed execution summary for token-efficient reads. Teaching notes for cross-soul transfer. [Hierarchical skill compilation](https://arxiv.org/abs/2508.14751) turns mastered procedures into reusable building blocks. |

Each tier gates a real capability. Creation auto-checkpoints to Apprentice — every new skill is immediately visible and usable. Journeyman → Expert is the trust gate. Expert → Master is the efficiency gate. This is not a badge system — tiers are mechanical thresholds that change how the system behaves.

The structural requirements at tier boundaries are [desirable difficulty](https://asmepublications.onlinelibrary.wiley.com/doi/10.1111/medu.14916) applied: deliberate challenge at each gate deepens cognitive processing and produces better long-term retention than unconstrained repetition. Journeyman needs failure paths. Expert needs edge cases. Master needs a compressed summary. These are regex checks over markdown headings — zero LLM cost — surfaced as "next tier requirements" during training. The session that produces the qualifying checkpoint naturally addresses the requirement.

Rank-up notifications are visible across all channels: `▲ deploy-vercel reached Journeyman (rank 3)!` in CLI output, web UI toast, and trainer response. [Progression without visible feedback loses engagement](https://www.intechopen.com/online-first/1221745) — the rank-up moment is the signal that keeps the compound loop invested. Ranks survive renames — they track the skill's folder path in git, not its frontmatter name.

[Learning follows power-law curves](https://www.nature.com/articles/s44260-025-00039-x) with diminishing returns as mastery approaches. Early ranks (1→5) produce the steepest improvement; later ranks (5→10) refine edges. The readiness system directs effort where the return is highest.

### Training Readiness

A single lightweight SQLite table captures every meaningful skill lifecycle event:

```sql
CREATE TABLE IF NOT EXISTS skill_events (
  skill TEXT NOT NULL,
  event TEXT NOT NULL,  -- 'read', 'checkpoint', 'created', 'retired'
  session_id TEXT,
  ts INTEGER DEFAULT (unixepoch())
);
```

One INSERT when a soul reads a skill. One INSERT when a checkpoint runs. This table powers training readiness, staleness detection, and utilization signals simultaneously.

For each skill, compute reads since last checkpoint:

| Reads since checkpoint | Color | Meaning |
|---|---|---|
| 0, few sessions elapsed | Grey | Nothing new to learn from. Training would be wasted. |
| 1–2 reads | Green | Marginal improvement possible. |
| 3–5 reads, 3+ sessions | Yellow | Enough evidence accumulated. Training worthwhile. |
| 6+ reads | Orange | Rich evidence pool. Train now for maximum gain. |

One SQL aggregate query. Zero LLM tokens. The WoW recipe difficulty mechanic made functional: orange means guaranteed skill point, grey means don't bother. The web UI shows a colored dot on each skill card. The trainer sees where effort has the highest return.

### Git Versioning

Skills are filesystem artifacts tracked by a dedicated git repository at `.ghostpaw/skill-history/`. Not stored in SQLite. Human-readable, git-versionable, shareable (copy a folder to another instance — the frontmatter carries everything), and corruption-resistant (content-addressable storage detects bit rot). Full diff, log, and rollback to any checkpoint. [Recursive Knowledge Crystallization](https://medium.com/google-cloud/recursive-knowledge-crystallization-a-framework-for-persistent-autonomous-agent-self-evolution-8243b3697471) independently validated the exact same architecture — SKILL.md on disk, evolving through iterative cycles, achieving zero-shot transfer to completely new environments. [Version-controlled instruction deltas yield 4–5x productivity gains](https://openreview.net/pdf?id=2unHBbaor7) in production deployments.

### Validation and Repair

Every skill is validated for structural correctness: SKILL.md presence, frontmatter validity (name must match directory), naming conventions, size sanity (500-line warning — [instruction-following accuracy hits 68% at 500 instructions](https://arxiv.org/abs/2507.11538) even for frontier models), and git artifact cleanup. Auto-repair handles common issues: flat files migrated to folder structure, missing frontmatter injected, name mismatches corrected. Pure code, runs on every `validate_skills` call.

## Train and Create

The user has two buttons.

### Train — The Reward Button

`ghostpaw skills train [skill-name]` — a 2-phase interactive flow.

**Phase 1: Propose.** The trainer reviews the skill's current content, checkpoint history, diff since last checkpoint, searches memories for evidence about its usage, and reads any pending skill fragments related to this domain. It proposes 2–4 specific improvement paths, each citing evidence. The user picks one or provides custom guidance. [Static reflection decays in quality](https://aclanthology.org/anthology-files/anthology-files/pdf/coling/2025.coling-main.504.pdf) — the adaptive propose/execute flow prevents this by grounding each proposal in fresh evidence.

**Phase 2: Execute.** The trainer applies the selected improvement — editing the content, validating structural correctness, and checkpointing the result. Rank advances by 1. Absorbed fragments are marked consumed. Two turns maximum. No unbounded loops.

Evidence grounding is enforced. "I found 3 memories about deployment failures related to environment variables" is a valid basis for a proposal. "This skill should probably cover environment variables" is rejected. [Targeted feedback reliably improves quality through 12+ iterations](https://arxiv.org/abs/2509.06770); vague feedback plateaus or *reverses* after 2–3. The evidence requirement is not a convenience — it is the mechanism that sustains improvement across dozens of training cycles.

**The split reflex.** When a skill absorbs too many fragments and approaches the 500-line limit — or when its content drifts outside its declared scope — the trainer proposes decomposition as one of its improvement paths: "deploy-vercel has grown to cover monitoring, rollback, and environment setup. Propose splitting into focused modules." The user selects. Original git history is preserved; extracted modules are auto-checkpointed to Apprentice (rank 1). [Focused skill modules yield +18.6pp improvement while monolithic all-in-one skills hurt at -2.9pp](https://arxiv.org/abs/2602.12670) — the split reflex operationalizes this finding as a mechanical response to growth.

### Create — Fill Genuine Gaps

New skills enter the system through three triggers. Same trainer, same validation, same checkpoint, same rank-up notification.

**User asks** (explicit): "Create a skill for deploying to Vercel." The coordinator delegates to the trainer. The trainer creates the folder, writes the SKILL.md with procedure, failure paths, and tool references, validates, and checkpoints to rank 1. Immediate need satisfaction.

**Coordinator notices** (implicit): During normal conversation, the coordinator detects a correction repeated three times, a deployment that finally worked after multiple failures, a workflow improvised repeatedly. It delegates to the trainer with the observed pattern. The user doesn't trigger this.

**Stoke proposes** (deferred): The nightly stoke found an orphan fragment cluster — multiple observations about API retry patterns with no matching skill. It queued a proposal. Next session, the coordinator surfaces it: "Stoke found 4 observations about API resilience. Create `api-resilience`? [y/n]" The user approves or dismisses.

**The human gate differs by trigger.** User-initiated creation is pre-hoc — the user asked for it, that IS the approval. Coordinator-initiated creation requires observed evidence (3+ observations) and offers post-hoc rollback via `rollback_skill`. Stoke-initiated creation requires explicit user approval before the skill is created. Every path requires either prior approval or strong evidence plus rollback capability.

This resolves a genuine contradiction in the research. [Self-generated skills average -1.3pp](https://arxiv.org/abs/2602.12670) — models that author their own procedures make themselves worse. But the [generation effect](https://link.springer.com/article/10.3758/s13423-020-01762-3) (meta-analysis: 126 articles, 310 experiments) says self-generated knowledge sticks better than received knowledge. Ghostpaw's resolution is the middle path: ghostpaw **writes** its own skills (generation effect: earned knowledge compounds), under **human curation** (SkillsBench: quality gate prevents garbage), from **real evidence** ([EvoSkill](https://arxiv.org/abs/2603.02766): grounded in actual failures, not speculation). Not fully autonomous (that fails). Not fully human-authored (that doesn't compound). Not imported from a marketplace (that won't stick). No other system explicitly threads this needle.

### The Compound Loop

```
Use → builds memories + drops fragments
  → Stoke mines memories → routes fragments to existing skills or queues proposals
  → Train absorbs fragments into skills (refine) → skills grow
  → Oversized? split into focused modules
  → Create fills genuine gaps (user request, coordinator detection, stoke proposal)
  → Use → ...
```

Two forces in equilibrium. Absorption pulls fragments into existing skills, preventing proliferation — most observations ARE refinements of what already exists. Splitting pushes oversized skills into focused modules, preventing monoliths. The equilibrium is self-regulating: fragments flow in until the skill outgrows its scope, then it splits out. [Expertise develops through forming chunks, growing them, then decomposing and reorganizing when they exceed capacity](https://doi.org/10.3389/fpsyg.2017.02001) — the compound loop mirrors this in code. [Intermediate representations create an implicit curriculum](https://proceedings.iclr.cc/paper_files/paper/2025/hash/3b4e1336f775c3dba16ebbb8d2afd258-Abstract-Conference.html) that accelerates learning beyond what the final artifact alone provides — fragments ARE this intermediate layer.

Day 100 has skills refined through dozens of real encounters — procedures no model update will ever capture because they came from this specific human's work.

## Fragments — Gathering While You Quest

Fragments are raw observations stashed in SQLite by any subsystem during normal operation. They are not skills. They are ore — unrefined signals that accumulate silently and get absorbed into training sessions or surface as creation proposals without a separate user action.

```sql
CREATE TABLE IF NOT EXISTS skill_fragments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,         -- 'quest', 'session', 'coordinator', 'historian'
  source_id TEXT,               -- quest ID, session ID, etc.
  observation TEXT NOT NULL,    -- 1-5 sentences of raw observation
  domain TEXT,                  -- optional hint: "deployment", "testing", etc.
  status TEXT DEFAULT 'pending',-- 'pending', 'absorbed', 'expired'
  consumed_by TEXT,             -- skill name that absorbed this fragment
  created_at INTEGER DEFAULT (unixepoch())
);
```

One function. One INSERT. Any subsystem calls it. Zero tokens. Zero friction.

```typescript
function dropSkillFragment(
  db: Database, source: string, sourceId: string,
  observation: string, domain?: string
): void
```

The fragment table is a decoupled message queue: other subsystems are producers, the trainer is the consumer, they never import each other's code. Every fragment is a byproduct of an LLM call that was already happening — no new LLM calls to create fragments.

**Quests** drop fragments when a quest completes — the warden already produces a completion summary, and the completion code extracts reusable-pattern observations. **Session consolidation** captures workarounds and novel workflows during the warden's normal post-session processing. **The coordinator** drops fragments for observations below the 3-correction creation threshold — "User corrected import order once." Marginal cost: a few extra output tokens in an existing response. **The historian** drops fragments during the nightly sweep for patterns that suggest skill opportunities rather than wisdom entries.

Fragments dissolve into existing operations without a separate processing step. During training, the trainer's prompt includes pending fragments alongside the skill's content and memories — relevant ones get absorbed, irrelevant ones stay pending. During creation, fragments related to the observed pattern are incorporated into the new skill. During stoke, Phase 2 routes pending fragments to existing skill domains and clusters orphan fragments into proposals. [Dynamically composing modular reasoning from evidence yields high-precision trajectories](https://arxiv.org/abs/2602.03279), and [structured procedures composed from clustered observations yield 5–9% accuracy improvements](https://arxiv.org/abs/2510.13935) — fragments are this principle applied to skill maintenance.

Limits keep the system hygienic: 50-fragment soft cap (oldest beyond 50 auto-expire), 90-day expiration for pending fragments, no deduplication at insert time (the trainer deduplicates naturally when reading). Token cost of including 15 fragments in a trainer prompt: ~750 tokens, marginal against a 3,000–5,000 token prompt that was already happening.

The reward loop is self-reinforcing: do quests → fragments accumulate → stoke routes them → training absorbs them into skills → better skills make future quests easier → richer fragments. Compound growth with zero extra user actions. The [explore-exploit tradeoff](https://arxiv.org/abs/2502.00225) is mediated by fragments: stoke explores (mines memories, routes observations), training exploits (absorbs evidence into procedures). The [cost-aware exploration principle](https://arxiv.org/abs/2602.16699) — observe first, commit later — is exactly what fragments implement.

## Stoke — The Nightly Forge

You stoke a forge — tend the fire, arrange the tools, lay out the materials. When the smith arrives, everything is ready. `stoke` is the builtin schedule that maintains the skills subsystem overnight so that every training session, every skill read, every creation is as good as it can be.

### Why Training Stays Manual

The nightly sweep prepares the reward. It does not deliver it.

Training is the crafting moment — the anvil click where gathered materials become a better item. The psychological loop: anticipation (readiness colors ripen from grey toward orange over days), readiness (orange, matching fragments, rich evidence), action (you click train, you choose the improvement path), result (the procedure you use every day just got measurably sharper — real words changed in a real file), ding (`▲ typescript-imports reached Expert (rank 6)!` — the system literally behaves differently now).

This is not a number going up. This is real-world impact on button click. [Self-Determination Theory](https://doi.org/10.1037/0003-066X.55.1.68) identifies three drivers of intrinsic motivation — competence (the skill gets better), autonomy (you chose when and how), relatedness (the result shows up in your next conversation). The training moment hits all three. Quests reward completing something external. Training rewards becoming better internally. Automating this turns the player into a spectator of their own progression. The readiness colors exist to create anticipation that makes the button click satisfying — auto-harvesting at orange removes everything worth looking forward to.

### The Sweep

**Phase 1: Code Prowl** (always, zero LLM, <100ms). Validate all skills + auto-repair structural issues. Expire 90+ day pending fragments. Compute readiness colors for all skills. Detect stale skills (checkpointed 90+ days ago, still being read), dormant skills (not read in 60+ days), and oversized skills (approaching 500 lines). Count pending fragments by domain. Compute rank distribution. Write `skill_health` summary to SQLite.

**Phase 2: Background Exploration** (conditional, one LLM call). Only fires if 5+ pending fragments exist AND at least 3 new fragments have arrived since the last Phase 2 run. If Phase 2 has never run, the first batch of 5 pending fragments triggers it. This gate mirrors the attunement cycle's `last_attuned_at` pattern — LLM tokens are spent exactly once per evidence batch, regardless of how frequently the job ticks. When it fires: one bounded `invokeTrainer` call with a hardcoded optimized instruction — read all pending fragments, read the skill index, route each fragment to matching skill domains, mine recent memories for friction signals not yet captured as fragments, and queue proposals for orphan clusters with 3+ independent observations and no matching skill. The trainer call is restricted to `dropSkillFragment` and `recall` — no skill creation, no file edits. Timeout: 2 minutes. Expected: ~30 seconds, ~$0.01–0.03.

```sql
CREATE TABLE IF NOT EXISTS skill_health (
  computed_at INTEGER DEFAULT (unixepoch()),
  total_skills INTEGER,
  rank_distribution TEXT,    -- JSON: {"Apprentice":2,"Journeyman":3,"Expert":1,...}
  stale_skills TEXT,         -- JSON array: no checkpoint in 90+ days
  dormant_skills TEXT,       -- JSON array: no reads in 60+ days
  oversized_skills TEXT,     -- JSON array: approaching 500 lines
  pending_fragments INTEGER,
  expired_fragments INTEGER, -- fragments expired THIS run
  repairs_applied INTEGER,   -- auto-repairs THIS run
  proposals_queued INTEGER,  -- new-skill proposals from Phase 2
  explored INTEGER           -- 1 if Phase 2 fired, 0 if skipped
);
```

The coordinator reads `skill_health` at session start and surfaces a **reward menu** — not a to-do list, but a set of available rewards:

```
Skills: 7 active, avg rank 4.2
  typescript-imports  ● orange  — train for guaranteed improvement
  deploy-vercel       ● yellow  — train for moderate improvement
  1 new skill proposal queued from overnight stoke
  skill-mcp flagged dormant (68 days unused)
```

The user picks which reward they want. Or ignores it — the system works either way. The briefing is an invitation, not an obligation.

### Schedule and Cost

`stoke` is a builtin schedule alongside `haunt`, `distill`, and `prowl`. Once per day by default. Phase 1 always runs when enabled. Phase 2 can be disabled independently via `stoke_explore_enabled`.

| | OpenClaw Heartbeat | Ghostpaw Stoke |
|---|---|---|
| Trigger | Fixed cron, every N minutes | Once/day, Phase 2 conditional |
| Idle cost | $1–5/day | $0.00 |
| Busy cost | $1–5/day (same) | $0.01–0.03/day |
| Output | "Nothing to report" (60–80%) | Health metrics + routed fragments + proposals |
| Skill modifications | None | None (stoke prepares, user trains) |

```
stoke (Phase 1)   → validate, expire, compute health     [0 tokens, <100ms]
stoke (Phase 2)   → background exploration if evidence warrants [~$0.02, ~30s]
wisdom sweep       → historian reads skill_health as input  [part of existing sweep]

Next morning:
coordinator        → reads skill_health at session start
                   → surfaces reward menu in briefing
user               → picks a reward (train, create, or ignore)
                   → the training session has pre-routed fragments + rich evidence
                   → the ding
```

**Self-healing and its limits.** Validation with auto-repair handles structural corruption. Fragment expiry (90 days) and cap enforcement (50) prevent unbounded growth. Stale detection (90+ days without checkpoint while still being read) and dormant detection (60+ days without reads) flag knowledge decay. The split reflex prevents monolith failure. Git-based rollback provides surgical recovery to any checkpoint. The Phase 2 cost gate prevents re-triggering on unchanged evidence. These cover the failure modes detectable in pure code. What the system cannot detect automatically is whether a skill's *content* is making outcomes worse — that requires causal isolation between "skill was followed" and "task outcome degraded," confounded by the fact that harder tasks naturally involve more skill reads. At personal-agent data volumes, the human-curated training cycle is the quality feedback loop: the trainer proposes improvements grounded in evidence, the human selects, and the checkpoint provides rollback if the result is worse.

## The Trainer

Seven specialist tools: `review_skills` (overview with ranks, readiness, pending changes), `create_skill` (scaffold a new skill folder), `skill_diff` (uncommitted changes since last checkpoint), `skill_history` (checkpoint log), `rollback_skill` (revert to any previous checkpoint), `checkpoint_skills` (commit changes, advance rank), and `validate_skills` (validate + auto-repair). Plus shared tools: `read`, `edit`, `write`, `ls`, `grep`, `bash`, `recall` (warden delegation for memory access). The tool surface sits safely below the [tool-count cliff](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools) where selection accuracy degrades.

**For training:** user says "train typescript-imports", clicks "Train This Skill" in the web UI, or responds to the reward menu. **For creation:** user asks explicitly, coordinator notices patterns and delegates, or user approves a stoke-queued proposal. The coordinator delegates with a specific task description. The trainer executes within its scoped tool surface and returns a summary. The coordinator never touches skill files directly.

All trainer operations follow `executeTurn(trainer, trainerTools, instruction)` — the universal primitive. Single-turn for creation. 2-phase propose/execute for training. Stoke variant with restricted tool surface (`dropSkillFragment` + `recall` only) for background exploration. The 2-phase pattern preserves context across the user's decision point — the trainer remembers its analysis when executing the chosen improvement, no re-analysis cost.

All skill mutations route through the trainer: create, modify, checkpoint, rollback, repair, delete. Other souls read skills through the code API (`buildSkillIndex`, `getSkill`). The coordinator reads skill files via the `read` tool during normal operation. But writes always go through the trainer — one authority per domain, no shared mutable state, no conflicting writers.

## How Skills Compound

**Boot.** Two default skills provisioned on first run: `effective-writing` (attention architecture, subliminal coding, revision technique — every soul benefits from this because writing quality is [too valuable to lock behind delegation](https://aclanthology.org/2024.emnlp-main.723) to a single specialist) and `skill-mcp` (MCP server integration patterns). Both at Apprentice (rank 1). ~10 tokens always-on. The system is functional from minute zero — [delta-updates from strong defaults prevent collapse](https://arxiv.org/abs/2510.04618).

**Week 1.** The user works normally. `effective-writing` gets read 5 times across 4 sessions — readiness turns orange. The coordinator notices three import corrections and creates `typescript-imports`. First training session on `effective-writing`: the trainer proposes improvements from memories about the user's writing preferences, the user picks one, rank advances. `▲ effective-writing reached rank 2.` Three skills, ~15 tokens always-on. Total skill-related LLM cost: ~$0.06.

**Month 1.** Stoke runs nightly. It mines friction signals, drops fragments — 6 relating to existing skills, 3 clustering around deployment patterns with no matching skill. It queues a proposal. The user approves: `deploy-vercel` is created. Later, `testing-patterns` emerges the same way. Five skills in the index. `effective-writing` hits Journeyman — the tier checkpoint forces failure/recovery sections. Fragments accumulate silently: 9 pending from quests, sessions, coordinator observations.

**Month 3.** Training biweekly, guided by readiness colors. When the user trains `deploy-vercel`, the trainer sees 4 fragments related to deployment patterns alongside the skill's content and memories — incorporates 3, leaves 1 tangential fragment pending. `deploy-vercel` reaches Journeyman. `effective-writing` hits Expert — `allowedTools` restrictions activate. `skill-mcp` is flagged dormant (60+ days unused). The user retires it — moved to `skills/.retired/skill-mcp/`, git history preserved, index drops to active skills only. [60% of enterprise knowledge systems fail from staleness](https://kminsider.com/blog/knowledge-lifecycle/) — active retirement prevents knowledge decay.

**Month 6+.** `effective-writing` reaches Master (rank 10). The training session produces a compressed execution summary — 15 lines of distilled procedure at the top, full detail below. Every future read is cheaper. Teaching notes enable cross-soul transfer. The library stabilizes at 15–30 active skills. New skills emerge occasionally from stoke proposals, but the core set is stable. Readiness mostly shows green/grey — the major improvements are behind. Occasional orange spikes when work changes direction.

```
effective-writing    Master (11)      ● grey     compiled form active
typescript-imports   Expert (7)       ● green
deploy-vercel        Expert (6)       ● yellow
testing-patterns     Journeyman (5)   ● green
git-workflow         Journeyman (4)   ● grey
docker-compose       Apprentice (2)   ● orange   (new, from recent quest)
```

The power-law distribution is visible: one Master, two Expert, two Journeyman, one new Apprentice. This matches the mathematical prediction — early skills refined the most, newer skills working their way up. [Naturally occurring power-law task distributions](https://arxiv.org/abs/2401.10393) mitigate catastrophic forgetting better than explicit mitigation techniques: frequently-used skills stay fresh through the compound loop, rarely-used skills drift toward retirement.

**At scale.** 10 skills = 50 tokens always-on. 30 skills = 150 tokens, with stoke flagging dormant skills for retirement. 50 skills = the practical ceiling for most users. Beyond this, the [modularity research](https://arxiv.org/abs/2602.12670) suggests diminishing returns. The natural equilibrium is 15–30 active skills for an active user. The system self-regulates through usage patterns without needing explicit throttling.

## How This Compares

IDE rules (Cursor, Windsurf, Copilot) are static configuration files. Write once, never evolve. [Windsurf loads all rules on every prompt](https://localskills.sh/blog/cursor-vs-claude-code-vs-windsurf) — developers with 10+ skills report context exhaustion. No ranking. No readiness signal. No feedback loop.

Claude Code adds auto-memory (MEMORY.md) and skills with progressive loading — the same index-then-load pattern ghostpaw uses. But there are no evidence gates on what gets written. No ranking. No training readiness. No anti-proliferation. Community hacks like [Claudeception](https://github.com/blader/claude-code-continuous-learning-skill) auto-extract skills from debugging sessions — which is exactly what [SkillsBench proved makes performance worse](https://arxiv.org/abs/2602.12670) (self-generated: -1.3pp). MEMORY.md grows until it hits the 200-line cap with no pruning signal, no compound loop, no retirement mechanism.

OpenClaw has [5,700+ skills on ClawHub](https://www.thecaio.ai/blog/openclaw-skills-clawhub-guide), growing 40–60/day. The marketplace breadth is unmatched. But [SkillNet found "strong ecosystem homogeneity with widespread intent-level redundancy"](https://arxiv.org/abs/2603.04448) — 40K skills with massive duplication. Skills don't rank up. Skills don't improve from use. There is no training readiness. The heartbeat burns $720+/month. Learning Loop and Capability Evolver are afterthought add-on skills, not core architecture.

Research systems (EvoSkill, Voyager, SkillWeaver, AutoSkill) prove individual mechanisms work in isolation. [Voyager achieved 3.3x unique items and 15.3x faster milestones](https://voyager.minedojo.org/) via a skill library in Minecraft. [AutoSkill demonstrated lifelong self-evolution from execution traces](https://arxiv.org/abs/2603.01145). [AutoRefine showed dual-form patterns exceed manual design](https://arxiv.org/abs/2601.22758) (27.1% vs 12.1%). None of them ship with human curation — the mandatory finding from SkillsBench.

| Capability | IDE Rules | Claude Code | OpenClaw | Ghostpaw |
|-----------|-----------|-------------|----------|----------|
| Skills improve from use | No | Manual or uncurated auto-extraction | No | Evidence-gated 2-phase training |
| Anti-proliferation | N/A | No | No (40K+ redundant skills) | Fragment routing: check existing first |
| Mechanical tiers | No | No | No | 5 tiers that change system behavior |
| Training readiness | No | No | No | WoW difficulty colors from pure SQL |
| Background maintenance | No | Per-session auto-memory | Heartbeat ($720+/month) | Stoke ($0 idle, ~$0.02 active) |
| Quality gate on creation | User writes them | None (auto-extract) | Upload to marketplace | Evidence + human curation per trigger |
| Skill retirement | Manual | 200-line cap, then unclear | No | Stale/dormant detection + soft-delete |
| Context cost of 50 skills | All loaded (exhaustion) | ~100 tokens metadata | All loaded | ~250 tokens index, full on demand |
| Compound loop | No | Weak (accumulation, not refinement) | No | Full: gather → route → train → split → create |

The gap is structural. Every other system either treats skills as static configuration or lets the AI modify them without quality gates. Ghostpaw resolves the [SkillsBench paradox](https://arxiv.org/abs/2602.12670) at a design level: evidence-gated creation, human-curated training, mechanical tiers that gate real capability, fragment routing that prevents the redundancy drowning every marketplace, and a background loop that costs 1,200x less than the alternative.

## Inspection

**CLI.** All commands under `ghostpaw skills`:

| Command | What it does |
|---------|-------------|
| `list` | All skills with ranks, readiness colors, descriptions, pending changes |
| `show <name>` | Full skill content + metadata + tier requirements |
| `status` | Aggregate stats: count, average rank, pending fragments, last stoke |
| `train [name]` | 2-phase interactive improvement |
| `create [topic]` | Create a new skill from explicit request |
| `stoke` | Run the nightly forge maintenance manually |
| `checkpoint` | Commit pending changes for specified skills |
| `validate` | Validate all skills, auto-repair fixable issues |

**Web UI.** Skill inventory as a card grid with rank badges, readiness color dots, descriptions, and pending-change indicators. Reward menu at the top: skills ready to train, queued proposals, stale/dormant flags. Skill detail as an offcanvas panel with full content, validation status, readiness color, and "Train This Skill" button. Proposal cards for stoke-queued new skills — approve or dismiss inline. Training page to trigger train/create with model selection.

**Skills code API** (pure functions, no LLM): `buildSkillIndex(workspace)` for prompt assembly, `listSkills(workspace)` for programmatic queries, `skillRank(workspace, name)` from git log, `skillReadiness(db, name)` from skill_events, `logSkillEvent(db, skill, event, sessionId)` for tracking. **Fragment API** (SQLite only): `dropSkillFragment`, `pendingFragments`, `pendingFragmentCount`, `absorbFragment`, `expireStaleFragments`. **Stoke API**: `stokePhaseOne` (zero LLM), `stokePhaseTwoNeeded` (boolean check), `stokePhaseTwo` (one LLM call), `readSkillHealth`, `pendingProposals`. All return sensible defaults when data is absent — empty arrays, zero ranks, grey readiness, null health. Fail-open: callers degrade gracefully.

## Why This Matters

Based on the specific mechanisms and the research backing each one, a ghostpaw instance with 15–30 curated, evidence-refined, modular skills should see [+16.2pp average pass rate improvement](https://arxiv.org/abs/2602.12670) from the skill library itself, [+18.6pp from modular organization](https://arxiv.org/abs/2602.12670) maintained by the split reflex, [+7.3–12.1% from failure-driven refinement](https://arxiv.org/abs/2603.02766), and avoidance of the [-1.3pp self-generated junk penalty](https://arxiv.org/abs/2602.12670) through evidence gates. The aggregate: **a smaller, cheaper model with ghostpaw's skill system should match or exceed a larger, more expensive model running bare.** The compounding effect — skills refined through months of real usage — produces a performance trajectory that model updates alone cannot replicate, because the knowledge is specific to this user's work, this user's tools, this user's failure modes.

No model update will ever teach an LLM how YOU deploy to YOUR infrastructure. A Master-rank deploy skill, refined through 10 real encounters, will.

Of 14 self-improvement mechanisms in the skills subsystem, 8 cost zero LLM tokens and require zero user action. The system mostly improves itself through code — pure SQL for readiness, pure filesystem for validation, pure git for versioning, pure code for tier checks and rank-up notifications. The two things the user does — train (the reward) and create (the curiosity) — are the two things worth doing. Everything else runs in the background, silently making every training session richer and every skill read more effective.

Skills encode procedure. [Souls](SOULS.md) encode cognition. [Memory](MEMORY.md) encodes beliefs. [Quests](../QUESTS.md) encode commitments. [Wisdom](WISDOM.md) encodes patterns. The boundary is sharp: if it is a reusable procedure with steps, it is a skill. If it is a principle without steps, it is a trait. If it is a fact, it is a memory. If it is a pattern, it is wisdom.

Ghostpaw on day 100 does not just know more. It executes from earned competence — procedures no model update will ever capture, refined through the specific life of this specific instance, compounding with every session. That is the thesis.

## Contract Summary

- **Owning soul:** Trainer.
- **Core namespace:** `src/core/skills/` with explicit `api/read/`, `api/write/`, and `runtime/`
  surfaces.
- **Scope:** procedural knowledge as markdown-first artifacts with local history, validation,
  readiness, fragment intake, and trainer-mediated evolution.
- **Non-goals:** stable facts, personality, or raw chat history. Those belong to `memory`,
  `souls`, and `chat`.

## Four Value Dimensions

### Direct

The user gets explicit procedures that improve over time: better deploy flows, cleaner writing
patterns, sharper debugging recipes, and visible rank/readiness states that make improvement tangible
instead of abstract.

### Active

The coordinator and trainer have unambiguous reasons to use skills: read a procedure before acting,
create a new procedure for a repeated workflow, checkpoint an improvement, or inspect readiness and
pending proposals before training.

### Passive

Usage silently compounds the subsystem. Reads generate lifecycle events, fragments accumulate from
other work, stoke validates and routes evidence, readiness colors ripen, and the skill index in the
static prompt gets better without the user managing a library manually.

### Synergies

Other subsystems can contribute and consume skills mechanically through local APIs: fragment
production with `dropSkillFragment()`, prompt-safe routing with `buildSkillIndex()` and
`formatSkillIndex()`, and operational inspection through `readSkillHealth()`, `pendingFragments()`,
and `pendingProposals()`.

## Quality Criteria Compliance

### Scientifically Grounded

The subsystem is based on skill-curation, procedural transfer, human-gated refinement, readiness, and
desirable-difficulty research. Each major mechanism below cites the specific studies supporting it.

### Fast, Efficient, Minimal

Skills live as plain markdown plus a few small SQLite support tables. Reads are cheap, the index is
cacheable, readiness is computed in code, and the nightly forge spends LLM tokens only when evidence
gates justify it.

### Self-Healing

Validation, auto-repair, stale-fragment expiry, readiness recomputation, oversize detection, and the
split reflex keep the library from drifting into unusable clutter.

### Unique and Distinct

Skills answer "how do we do this?" They are neither facts (`memory`) nor identity (`souls`) nor
social context (`pack`). Their unique job is to store and evolve reusable procedures.

### Data Sovereignty

All persistent skill mutations flow through `src/core/skills/api/write/**` and trainer-owned flows.
Other subsystems can inspect and contribute evidence, but they do not write arbitrary skill files or
tables directly.

### Graceful Cold Start

Bundled default skills provide immediate value. New skills are visible at Apprentice rank as soon as
they are created and checkpointed. Empty fragment queues and empty proposal queues degrade to "nothing
to train yet," not dead weight.

## Data Contract

- **Primary artifacts on disk:** `skills/<name>/SKILL.md` plus optional `scripts/`,
  `references/`, and asset files.
- **History store:** `.ghostpaw/skill-history/` is the dedicated git-backed checkpoint log for skill
  evolution.
- **Primary SQLite tables:** `skill_events`, `skill_fragments`, `skill_health`, and
  `skill_proposals`.
- **Canonical file models:** `Skill`, `SkillFrontmatter`, `SkillFiles`, `SkillSummary`, and
  `SkillIndexEntry`.
- **Canonical evidence models:** `SkillFragment`, `SkillHealthData`, `SkillProposal`, and readiness
  colors (`grey`, `green`, `yellow`, `orange`).
- **Lifecycle invariant:** imported or newly created content does not enter the universal skill index
  until it has been validated and checkpointed into the visible rank system.

## Interfaces

### Read

`allSkillRanks()`, `discoverSkills()`, `getSkill()`, `listSkills()`, `pendingChanges()`,
`skillPendingChanges()`, `skillDiff()`, `skillHistory()`, `buildSkillIndex()`, `formatSkillIndex()`,
`skillRank()`, `skillTier()`, `validateAllSkills()`, `validateSkill()`, `fragmentCountsBySource()`,
`listFragments()`, `pendingFragmentCount()`, `pendingFragments()`, `getSkillMarkdown()`,
`readSkillHealth()`, `projectSkillReadContent()`, `pendingProposals()`, `readinessForAll()`, and
`skillReadiness()`.

### Write

`checkpoint()`, `createSkill()`, `deleteSkill()`, `repairFlatFile()`, `repairSkill()`, `rollback()`,
`logSkillEvent()`, `absorbFragment()`, `dropSkillFragment()`, `enforceFragmentCap()`,
`expireStaleFragments()`, `writeSkillHealth()`, `approveProposal()`, `dismissProposal()`, and
`queueProposal()`.

### Runtime

`bootstrapSkills()`, `ensureDefaults()`, `DEFAULT_SKILLS`, `initHistory()`,
`initSkillEventsTables()`, `initSkillFragmentsTables()`, `initSkillHealthTables()`, and
`resetGitAvailableCache()`.

## User Surfaces

- **Conversation:** the coordinator and trainer read and create skills through natural work.
- **CLI:** inspect, create, validate, checkpoint, train, and roll back.
- **Web UI:** browse skill cards, readiness colors, proposals, diffs, and training actions.
- **Background maintenance:** `stoke` validates, routes evidence, updates health, and queues
  proposals.

## Research Map

- **Artifact format and prompt-safe index:** `The Skill` and `The Index`
- **Rank/readiness mechanics:** `Rank and Tiers` and `Training Readiness`
- **Evidence intake and silent accumulation:** `Fragments — Gathering While You Quest`
- **Background maintenance and human-gated improvement:** `Stoke — The Nightly Forge`
