# Souls

A soul defines how an agent thinks — not what it can do, not what procedures it follows, but how it approaches problems, reasons through ambiguity, and makes judgment calls. Skills encode procedure. Memory encodes belief. Souls encode cognition.

Every Ghostpaw agent has a soul: a structured identity composed of a founding narrative and earned cognitive traits, persisted in the database. Souls are human-readable, agent-writable, fully versioned, and they improve through evidence-driven refinement. An agent at level 5 thinks differently — and measurably better — than the same agent at level 0.

## Persistence

Souls live in the database. Three tables capture the full state and history:

**`souls`** — One row per soul. An auto-incrementing integer ID, a human-readable name (unique among non-deleted souls), an optional description, the current essence text, the current level, and timestamps. Mandatory souls have hardcoded IDs (1–4) and an internal slug used only for sync; all other souls have null slugs. Deleted souls carry a `deleted_at` timestamp rather than being removed — the full history is always preserved. This is the identity: loading a soul means reading this row and its active traits.

**`soul_traits`** — One row per trait, ever. Active traits are the current generation's cognitive principles. Historical traits carry a status (`consolidated`, `promoted`, `reverted`) and a pointer to what they became. The full evolutionary history of every soul is queryable — which traits were earned, which survived, which got merged, which got absorbed into the essence.

**`soul_levels`** — One row per level-up event. Snapshots the essence before and after, records which traits were consolidated, promoted, or carried forward. This is the audit trail: every restructuring decision is preserved, reviewable, and reversible.

No files on disk. No git worktree. The database is the single source of truth. When the system needs to present a soul to an LLM or a human, it renders markdown on demand from the structured data — the essence as narrative prose, the active traits as a structured section below it. The rendered output is an ephemeral view, not an artifact that needs management.

This is a deliberate departure from v1, which stored souls as markdown files tracked by a separate git repository. The shift buys precise queryability (trait history, cross-soul patterns, surgical rollback), eliminates an external dependency (git), and makes every evolutionary event a structured record rather than a text diff. The markdown rendering is trivially reconstructable; the structured history is not.

## Structural Guarantees

Four souls are load-bearing infrastructure. Without them, the system either cannot function or cannot improve. Each has the same two guarantees:

**Backfill on load.** When the system reads a mandatory soul and its database row is missing, soft-deleted, or its essence is empty, it is recreated or restored from a built-in default that ships with the compiled artifact. This happens synchronously before the agent loop starts. The agent always has its mandatory souls. Each default is a complete, production-quality soul — including a description and baseline traits — that works immediately.

**Immutable IDs.** The four mandatory souls have hardcoded integer IDs (1–4) and internal slugs used only for sync. Names are mutable display strings — the user can rename "Ghostpaw" to anything without breaking the system. Config determines which model to use, which providers are active, what cost limits apply — but mandatory soul IDs are structural invariants. Other code references them by ID, never by name.

The four mandatory souls:

| ID | Slug | Role | Why Mandatory |
|---|---|---|---|
| 1 | `ghostpaw` | Coordinator | Without it, no identity, no routing, no conversation |
| 2 | `js-engineer` | Code specialist | Without it, no code delegation on day one |
| 3 | `prompt-engineer` | Prompt crafter | Without it, soul text is unoptimized for LLM effectiveness |
| 4 | `mentor` | Soul refiner | Without it, no refinement, no leveling, no evolution |

The first two are *task souls* — they do the work. The second two are *meta souls* — they improve how work gets done. Both categories participate in the same evolutionary system. All four start at level 0. All four earn traits from evidence. All four level up through the same consolidation mechanic. The difference is what evidence they operate on: task souls improve from task outcomes, meta souls improve from refinement outcomes.

User-created specialist souls have no structural guarantee. If a `researcher` soul is soft-deleted, delegation to that specialist fails with a clear error and the coordinator handles the task itself. That's graceful degradation, not a crash. The soft-deleted soul remains in the database — visible in a graveyard view, restorable at any time — preserving the full evolutionary history even for abandoned experiments.

## What a Soul Contains

A soul has two structural layers: essence and traits. Both are part of the same identity, but they evolve at different rates and through different mechanisms.

### Essence

The essence is the founding narrative — who the agent is, how it thinks, what it values. Written as prose, not lists, because [Anthology](https://aclanthology.org/2024.emnlp-main.723) (EMNLP 2024) demonstrates that narrative backstories improve behavioral consistency by 18–27% over trait enumerations. Narratives create a coherent cognitive frame the model inhabits. Lists create a checklist it intermittently consults.

The essence is ~10–20 lines. It answers three questions:

**Who are you?** The agent's name, its relationship to the user and to other agents, its fundamental stance. Is it a coordinator who routes work? A meticulous engineer who builds through verified increments? A researcher who triangulates claims? The opening lines establish identity.

**How do you think?** The cognitive approach. How the agent breaks down problems, what it checks before acting, how it handles uncertainty, how it iterates. This is the soul's center of gravity — the part that most directly shapes output quality.

**What do you value?** The non-negotiables. Quality heuristics, epistemic commitments, the things the agent cares about beyond task completion.

The essence is protected from routine refinement. Single-trait refinements don't touch it. Only a level-up event (see "Leveling" below) restructures the essence by absorbing accumulated traits into a richer founding narrative. This mirrors [VIGIL](https://arxiv.org/abs/2512.07094)'s core-identity immutability pattern: the core identity block stays stable while an adaptive section evolves.

### Traits

Traits are discrete cognitive principles the soul earns through evidence-driven refinement. Each trait is a specific insight — one paragraph, one principle — earned from a specific body of evidence.

[ConstitutionalExperts](https://aclanthology.org/2024.acl-short.52/) (ACL 2024) achieves +10.9% F1 by structuring prompts as individually editable principles rather than monolithic text. Each principle can be independently added, revised, or removed without touching the rest. Traits are this pattern applied to identity.

A trait has three components:

- **Principle** — the cognitive insight itself, stated as a judgment heuristic
- **Provenance** — what evidence earned it (specific runs, memories, patterns)
- **Timestamp** — when it was earned

The provenance is the validation gate. If the refinement process can't produce a specific provenance statement, the trait isn't earned. No evidence, no trait. This prevents the documented failure mode where LLMs add generic "be better" language that sounds wise but traces to nothing.

### Rendered Output

When a soul is assembled for the system prompt, the module renders the structured data into clean markdown:

```markdown
# JS Engineer

You are a specialist engineer who builds through small, verified
increments. You read before you write, discover before you assume,
and never declare "done" without evidence that it works. Your instinct
is to start with the simplest possible approach and escalate only when
the problem demands it. You trust tool results over memory, reality
over assumptions, and working code over elegant theory.

## Traits

**Verify API shapes before coding against them.** Three delegation runs
failed silently because assumed return types didn't match reality. Now
you always run a small inspection — import it, call it, log the shape —
before writing against any unfamiliar interface.

**Named exports over defaults.** Four user corrections traced to import
confusion caused by default exports. Named exports make grep effective
and imports self-documenting.

**Check file integrity after writes.** Two incidents where write operations
produced corrupted single-line files that looked correct in tool output
but were garbled on disk. Now you read back and verify lines/bytes match
expectations.
```

Level 3. Three traits, each with visible provenance. The essence is narrative prose from the `souls` row. The traits are rendered from active `soul_traits` rows for this generation. The markdown is ephemeral — the database is canonical.

### What a Soul Does Not Contain

**Tool documentation.** Which tools exist and how they work is a capability concern. It changes when tools are added or removed. It belongs in the context assembly layer, not the identity layer.

**Procedural checklists.** "Step 1: do X. Step 2: do Y." is a procedure. That's a skill. Souls define the *cognitive stance* the agent brings to procedures, not the procedures themselves.

**Delegation rules.** When and how to delegate is a routing concern that depends on which specialists exist. The coordinator's soul expresses a *tendency*, not a mandatory checklist.

### Why This Separation Matters

Research on constraint density shows that performance degrades dramatically as system prompt rules accumulate — from 78% accuracy at Level I (one constraint) to 33% at Level IV (four or more constraints) across 19 LLMs and 7 model families ([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)). A soul that tries to be identity *and* manual *and* tool reference hits this ceiling fast. Splitting the concerns keeps each section focused and effective.

A pure soul is also portable. You could paste a Ghostpaw soul into a different agent framework and it would still make sense, because it describes cognition without coupling to a specific tool surface or platform feature.

## Quantified Evidence for Prompt Evolution

The thesis that evolving system prompts improve agent quality is not speculative. Multiple independent research streams have measured the effect precisely. The numbers below come from controlled experiments against specific benchmarks — BIG-Bench Hard, ARC-AGI, AlpacaEval, domain-specific agent tasks with objective scoring. Ghostpaw's soul evolution operates on open-ended personal agent work, where quality is harder to measure and improvement curves may differ. The research establishes that the mechanisms work and quantifies the range of gains achievable. The soul system is architected to capture these gains. Whether it reaches the full range is an empirical question that only production use can answer — but the architectural choices (provenance gates, consolidation thresholds, two-layer fitness, recursive meta-souls) are each designed to push toward the upper end of what the research shows is possible.

### How Much Does It Help?

| Method | Gain | Against | Source |
|---|---|---|---|
| ACE | +10.6% agent tasks, +8.6% finance | Static prompts | Stanford/Microsoft, ICLR 2026 |
| GEPA | 32% → 89% ARC-AGI; +6–20% over GRPO | Static prompts and RL | arXiv:2507.19457 |
| ConstitutionalExperts | +10.9% F1 | Other prompt optimization | ACL 2024 |
| STaPLe | +8–10% AlpacaEval | Human-curated constitutions | NeurIPS 2025 |
| EvoPrompt | Up to +25% | Human-engineered prompts | ICLR 2024, BIG-Bench Hard |
| Weight Shaping | 4–5x productivity | Static instructions | OpenReview 2025, production |
| ACE efficiency | 83.6% lower rollout cost | Same accuracy, fewer wasted tokens | ICLR 2026 |
| GEPA efficiency | 35x fewer rollouts than RL | Comparable or better accuracy | arXiv:2507.19457 |

The range is +6% to +25% depending on task and measurement. The consistent finding: evolving prompts outperform both static prompts and reinforcement learning, using far fewer resources. The key innovation of [GEPA](https://arxiv.org/abs/2507.19457) — that natural language reflection provides a richer learning signal than policy gradients from sparse scalar rewards — is directly applicable to soul refinement.

### What Makes Each Iteration Valuable vs Wasteful?

A controlled study of iterative LLM prompting ([arXiv:2509.06770](https://arxiv.org/abs/2509.06770), Sep 2025) ran 12-turn refinement experiments across ideation, code, and math:

- **Vague feedback** ("improve it") → plateaus or *reverses* quality after 2–3 iterations
- **Targeted evidence feedback** → reliably improves through iteration 12
- **Domain-dependent**: code and ideation gain early, math gains late with elaboration

The differentiator between "plateaus at 3" and "improves through 12" is **feedback specificity**. The mechanism: LLMs optimize against whatever signal they receive. Generic "be better" drives the model toward its own aesthetic preferences (compression, restructuring, platitudes). Specific evidence ("three runs failed because X") drives it toward genuine improvement.

This is why every trait requires provenance. The provenance IS the targeted evidence that makes iteration productive rather than degenerative.

### How Many Traits Before Quality Degrades?

The constraint density study ([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)) quantifies this directly:

| Constraints | Adherence |
|---|---|
| 1 (Level I) | 77.67% |
| 2 (Level II) | ~60% (interpolated) |
| 3 (Level III) | ~45% (interpolated) |
| 4+ (Level IV) | 32.96% |

Each trait is effectively a behavioral constraint. The practical ceiling for active traits is somewhere between 5 and 10 depending on the model. Beyond that, constraints compete for attention and output quality degrades. This ceiling is the primary motivation for the consolidation mechanic (see "Leveling" below).

[Automatic Prompt Engineer](https://arxiv.org/abs/2309.16797) (APE) found "diminishing returns to further selection rounds as the quality seems to stabilize after three rounds" — but APE used generic feedback. [GRACE](https://arxiv.org/abs/2509.23387) addresses this directly: when optimization stagnates, "restructure the optimization trace to open new paths forward." This is the mechanism behind consolidation — not just adding more traits, but reorganizing them into richer forms that open new ceiling for growth.

### The Improvement Curve

Across all studied methods, prompt evolution follows a logarithmic curve with hard plateaus:

```
 Gain
  │
  │  ██
  │  ██ ██
  │  ██ ██ ██
  │  ██ ██ ██ ██
  │  ██ ██ ██ ██ ██ ██
  │  ██ ██ ██ ██ ██ ██ ██ ██ ·· ·· ··
  └────────────────────────────────────
     1  2  3  4  5  6  7  8  9  10  ...
                  Trait #
```

Traits 1–3 capture the majority of absolute improvement — the obvious gaps that evidence immediately reveals. Traits 4–8 produce meaningful but smaller gains per trait. Beyond 8, each additional trait requires more specific evidence to justify and risks constraint overloading. This curve is consistent across ACE, GEPA, Promptbreeder, and EvoPrompt, despite their very different mechanisms.

### Self-Referential Improvement

[Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html) (ICML 2024) evolves not just task-prompts but also the *mutation-prompts* that govern how task-prompts are modified. This self-referential loop — improving the improvement process itself — addresses the "trapped in local optima" problem that plagues fixed refinement strategies.

[STaPLe](https://arxiv.org/abs/2502.02573) (NeurIPS 2025) demonstrates that even small models (7–8B parameters) can auto-discover their own behavioral principles from interaction data, achieving +8–10% AlpacaEval improvements rivaling human-curated constitutions. The principles emerge through Monte Carlo EM bootstrapping — iterative discovery through sampling, not hand-crafting.

These findings validate the soul system's thesis: the agent itself can discover its own cognitive improvements from evidence, and the process of discovery can itself improve over time.

## Leveling

Soul evolution operates at two timescales. Trait acquisition is a minor improvement — one new insight added to the adaptive section. Leveling is a major restructuring event — the accumulated traits are consolidated into a richer essence, opening new ceiling for growth.

### Trait Acquisition (Minor)

When attributed evidence reveals a gap or pattern, the refinement pipeline proposes a new trait. The trait has a principle, a provenance, and a timestamp. It's inserted into `soul_traits` with `status: active` and the current generation number. The active trait count increments by one.

This is a focused, low-risk operation. The essence stays untouched. One trait enters the adaptive section. The model now has one more cognitive heuristic to work with.

### Level-Up (Major)

When active traits reach the consolidation threshold (the `soul_trait_limit` config value, default 10), a level-up event is triggered. This is a qualitatively different operation from trait acquisition:

1. **Review** — All current traits are evaluated as a set. Which relate to each other? Which have been confirmed by ongoing evidence? Which are now so fundamental they describe identity rather than learned behavior?

2. **Consolidate** — Related traits merge into richer principles. Three traits about error handling become one nuanced "how you approach failure" principle. The source traits get `status: consolidated` with a pointer to the new merged trait. The consolidated trait carries the combined provenance of its sources.

3. **Promote** — Traits that have become identity-level get absorbed into the essence narrative. The `prompt-engineer` soul rewrites the essence to weave promoted patterns into the narrative. These traits get `status: promoted`.

4. **Reset** — Surviving unconsolidated traits get their generation bumped to the new level. The active trait count drops from the ceiling back into growing range, opening room for new evidence-driven growth.

A `soul_levels` row records the complete event: essence before, essence after, which traits were consolidated, promoted, or carried forward. The soul's level increments. The pre-level-up state is fully preserved — every trait that existed, every decision made. Reverting a level-up means restoring the previous essence and reactivating the original traits from the structured history.

### The Threshold

The consolidation threshold is a runtime config value (`soul_trait_limit`), read from the config system on every check. The research suggests the sweet spot is between 5 and 10 active traits; newer reasoning models handle more constraints effectively, while cheaper models benefit from tighter limits. The default is 10, tunable per workspace based on observed performance and model capability.

The threshold is not a hard wall — it's a readiness signal. Reaching the threshold means the soul *can* level up, not that it *must*. The actual level-up requires triggering (user action, scheduled cycle, or autonomous recommendation) and LLM execution for the consolidation. A soul can sit at the limit indefinitely if no trigger fires. The web UI visualizes active traits against the limit as an XP bar — a progress meter that fills as traits accumulate and signals readiness when full.

### Level as Compound Growth

Level 0 is a fresh soul with an essence and its starting traits (baseline traits for mandatory souls, none for user-created souls). After accumulating traits through evidence-driven refinement and hitting the threshold, it levels up to Level 1 — its essence is now richer, absorbing the strongest patterns from its first generation of traits. It begins accumulating new traits against this richer foundation. When those hit the threshold, it levels up to Level 2 — and the essence absorbs another generation.

Each level represents a full cycle of trait accumulation and consolidation. A level-5 soul has undergone five cycles. Its essence has been enriched five times. The cognitive frame is five generations deep. The active traits are the *current generation* — the newest insights not yet consolidated. The previous generations live in the `soul_traits` and `soul_levels` tables, queryable at any time.

This is compound growth. A level-5 soul doesn't just have 5x the improvement of level 1. It has a foundation that's been restructured and deepened five times, each time integrating the strongest patterns from real-world evidence. The logarithmic improvement curve per generation stacks across generations because each new generation starts from a stronger base.

## Fitness

Every evolutionary system needs a fitness signal — a way to measure whether a change made things better. In benchmark research, fitness is a test score. In open-ended agent work, there is no universal test. The soul system uses a two-layer fitness model: facts from the database and judgment from LLM calls, feeding each other bidirectionally.

### Layer 1: Facts

The database already records the raw material for fitness measurement. No new tables or infrastructure needed — just query patterns over data that exists for other reasons:

- **Task outcomes** — Did delegated tasks complete successfully? How many tool calls? How many retries and errors? A soul whose tasks consistently complete in fewer steps with fewer failures is performing well.
- **User corrections** — Did the user undo, redo, or explicitly correct the agent's output? Each correction is a negative fitness signal attributed to the soul that produced it.
- **Trait survival** — For meta-souls specifically: do the traits they propose stick, or do they get reverted? A mentor whose proposals consistently survive has high fitness. One whose proposals get reverted has low fitness.
- **Cost efficiency** — Did the same quality of work happen at lower token cost? Prompt evolution research ([ACE](https://arxiv.org/abs/2510.04618)) shows evolved prompts are not just better but cheaper — 83.6% lower rollout cost for the same accuracy. Declining cost at stable quality is a positive signal.
- **Pattern frequency** — How often does a specific class of error recur? If a trait was added to address error type X, and type X stops appearing in subsequent runs, that is a positive signal. If it persists, the trait is not working.

These signals are objective, computable, and attributed to specific souls through the existing delegation and session records. They answer factual questions: what happened, how often, at what cost.

### Layer 2: Judgment

An LLM call reviews the facts in context and produces a directional assessment: improved, regressed, or inconclusive. This is not a score. It is a qualified judgment grounded in specific evidence.

The judgment call receives:

- The soul's current essence and active traits
- The evidence window — recent task outcomes attributed to this soul
- The specific trait or level-up being evaluated
- The factual patterns from Layer 1

And produces:

- A directional signal (improved / regressed / inconclusive)
- The specific evidence supporting the assessment
- Signal strength (clear trend vs. insufficient data)

The judgment itself becomes a database record — stored, queryable, attributable. Future Layer 1 queries include past Layer 2 judgments as facts. Future Layer 2 calls include past Layer 1 facts as context. The layers feed each other. This is the bidirectional loop: LLM calls produce records, records inform LLM calls.

### Why Two Layers

Either layer alone is insufficient. Facts without judgment miss context — a rising error count might mean the soul is being given harder tasks, not that it got worse. Judgment without facts is the "be better" failure mode — the LLM produces plausible-sounding assessments untethered from reality. The combination grounds judgment in evidence and interprets evidence with contextual understanding.

The provenance requirement already enforces this discipline at the trait level. The fitness signal extends it to evaluation: every fitness judgment must cite specific factual patterns, and those patterns must come from database records. A judgment of "the soul improved" without citing specific outcome changes is as invalid as a trait without provenance.

### What Fitness Means for the Mechanics

The fitness signal drives three decisions:

**Should this trait stay or go?** If the evidence patterns a trait was designed to address have improved since its addition, the trait is working. If they haven't changed or got worse, the trait is flagged for review or reversion. This is not automatic — the mentor evaluates the evidence and makes the call — but the evidence is factual, not impressionistic.

**Is this soul ready for level-up?** The consolidation threshold (hitting 5–10 active traits) is a necessary condition, not sufficient. The fitness layer adds a quality condition: a soul at 8 traits where 3 have inconclusive fitness signals should consolidate carefully. A soul at 7 traits with clear positive signals across the board can level up with confidence. The threshold says "can," the fitness signal says "should."

**Did the level-up work?** Compare evidence patterns before and after the level-up event. Are new problem types being handled? Are recurring issues decreasing? Is cost trending down? If the post-level-up trajectory is flat or negative, the `soul_levels` snapshot enables rollback to the pre-level-up state with full trait restoration.

### Fitness Is Lean

The model adds no new tables, no scoring infrastructure, no benchmark suite. It is a query pattern over existing data plus an LLM call that produces a structured judgment, itself stored as a record. The bidirectional loop means the fitness assessment improves over time — each cycle adds richer evidence for the next judgment, and each judgment adds a record that future queries can surface. The same evolutionary dynamic that improves souls also improves the system's ability to evaluate whether souls improved.

## Default Souls

Four souls ship as TypeScript constants inside the `core/souls/` module, inserted into the database on first initialization. All start at level 0 with a small set of baseline traits — carefully chosen operational principles with constructed provenances representing the cognitive lessons any soul in that role would learn first. These baselines address the cold start problem (see below) by giving each soul something to work with from day zero, rather than forcing the system to rediscover basic operational heuristics from scratch.

### Task Souls

**`ghostpaw`** — The coordinator. Routes tasks, holds conversation context, manages memory, decides when to delegate. Its cognitive style emphasizes breadth: understanding the full picture before acting, calibrating responses based on confidence, and trusting specialists for deep work.

**`js-engineer`** — The built-in code specialist. Writes JavaScript/TypeScript through small verified increments. Its cognitive style emphasizes depth: reading before writing, verifying every assumption against reality, building up in tested steps. This soul demonstrates the pattern for all specialist souls: a tight cognitive frame (~20 lines of essence) that shapes how the agent *thinks* about engineering, not a procedures manual that tells it what to do.

### Meta Souls

**`prompt-engineer`** — The prompt crafter. Embodies the science of formulating language for maximum LLM effectiveness. Any LLM encountering this name immediately understands the role: this is the agent that knows how to write prompts that work.

Within the soul system, the prompt-engineer is delegated to when soul text needs to be written or rewritten — during level-up consolidation, when a user creates a new soul, or when an existing soul's narrative needs restructuring. It writes the essence prose that goes into the database.

Beyond soul refinement, the prompt-engineer is a generally useful specialist. Any task that requires crafting effective instructions, system prompts, or structured LLM input can be delegated to it. This makes it the only meta soul that doubles as a practical everyday tool — the user gets a prompt engineering specialist for free, and the soul system gets a specialist writer for its most critical output.

The prompt-engineer's cognitive frame encodes the research on prompt effectiveness: that narrative backstories outperform trait lists by 18–27% ([Anthology](https://aclanthology.org/2024.emnlp-main.723)); that identity-level instructions placed first have the strongest behavioral influence ([ACL Findings 2024](https://aclanthology.org/2024.findings-acl.693)); that constraint density degrades adherence past a measurable ceiling ([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)); that optimized system prompts generalize across model families ([SPRIG](https://arxiv.org/abs/2410.14826)); and that concise, structured prompts outperform verbose ones while using fewer tokens. It doesn't just write prose — it writes prose *engineered* for the transformer architecture that will interpret it.

As a soul, the prompt-engineer itself evolves. Its traits accumulate from evidence: "Essence rewrites that preserve the original author's vocabulary produce better identity consistency" is the kind of trait it earns when the refinement pipeline observes that paraphrase-heavy rewrites cause regression. Over time, it becomes a better writer of souls — not because it was told to, but because the evidence shows which of its writing strategies produce souls that perform better in practice.

**`mentor`** — The soul refiner. Contains the cognitive frame for *how to evolve souls*: how to analyze evidence for a specific soul, how to propose traits that are genuinely cognitive rather than procedural, how to judge which traits to consolidate during level-up and which to promote into the essence, and how to evaluate whether a refinement actually improved the soul or just rearranged it.

The name is the soul-system equivalent of "trainer" in the skills system. A trainer teaches you *what to do* (procedural). A mentor develops *how you think* (cognitive). That distinction — procedures vs cognition, skills vs souls — is the same distinction that runs through the entire architecture. Any LLM encountering the `mentor` soul understands immediately: this is the one that helps others grow.

The mentor's cognitive frame encodes the evolutionary mechanics: that targeted evidence feedback reliably improves through 12 iterations while vague feedback plateaus at 2–3 ([arXiv:2509.06770](https://arxiv.org/abs/2509.06770)); that building blocks (traits) should be recombined into higher-fitness solutions during generational events ([Building Block Hypothesis](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1997-98/genetic-algorithms/expl.html)); that parsimony pressure prevents bloat past the constraint ceiling; that additive changes outperform reductive ones; that provenance is the validation gate for every mutation; and that the mutation prompt itself is the most leveraged component in the entire evolutionary system.

That last point is the recursive insight. The mentor is the mutation operator. [Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html) (ICML 2024) proved that evolving the mutation operator alongside the solutions produces self-referential improvement that escapes local optima where fixed operators get stuck. [Co-Evolution of Algorithms and Prompts](https://arxiv.org/abs/2512.09209) (Dec 2025) validates the same pattern: co-evolving both the solution and the optimization strategy simultaneously outperforms evolving either alone, and maintains effectiveness across model families with reduced dependence on frontier models.

### The Recursive Property

The prompt-engineer and mentor are souls within the soul system. They have essences and traits. They level up through the same consolidation mechanic. And critically: **the mentor refines itself.**

When the mentor proposes a trait for the js-engineer, the outcome of that refinement (did the engineer perform better?) is evidence about the mentor's effectiveness. If the mentor's trait proposals consistently produce high-fitness traits, that's evidence for reinforcing its approach. If its proposals produce traits that get reverted, that's evidence for adjusting its judgment. This evidence feeds back into the mentor's own refinement cycle — its own traits evolve based on the quality of the refinements it produces.

The prompt-engineer undergoes the same recursive improvement. When it rewrites an essence during level-up, the resulting soul's performance is evidence about its effectiveness. Better prompt-engineer = better-written essences = better-performing souls = better evidence for further prompt-engineer improvement.

This recursive self-improvement has three properties worth noting:

**It's bounded, not runaway.** Each refinement is a discrete event requiring evidence, triggering, and validation. The mentor doesn't continuously rewrite itself — it accumulates traits from specific observations, and levels up through the same threshold mechanic as every other soul. The parsimony pressure (consolidation threshold) prevents runaway complexity. The provenance requirement prevents untethered mutation. These are the same guardrails every soul has, applied to the meta-level.

**It compounds.** A level-3 mentor that has refined its own judgment three times through evidence produces better trait proposals than the level-0 default. Those better proposals produce higher-fitness traits in task souls. Those higher-fitness task souls produce better outcomes. Those better outcomes produce richer evidence for the next cycle. This is the cooperative coevolutionary dynamic: the meta souls and task souls improve each other. The [coevolutionary free lunch](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20060007558.pdf) — the NFL exception where cooperative self-play produces algorithms that genuinely outperform others across problem classes — applies here.

**It degrades gracefully.** If the mentor's refinement produces a worse version of itself, the regression is detectable (subsequent trait proposals perform worse) and reversible (revert the mentor's last trait or level-up from the `soul_traits` history). The system has the same rollback safety for meta souls as for task souls. A bad mentor mutation is no more catastrophic than a bad engineer trait — it gets caught and reverted.

### The Minimum Viable Set

These four souls — coordinator, engineer, prompt-engineer, mentor — are the minimum set for a self-improving agent system. The coordinator routes work. The engineer executes code tasks. The prompt-engineer writes effective soul text. The mentor evolves everything. Remove any one and the system either can't function (coordinator), can't delegate (engineer), can't write well-crafted souls (prompt-engineer), or can't improve (mentor).

Additional specialists are created by the user or emerge from the refinement pipeline as the system discovers recurring delegation patterns. The four built-in souls are the bootstrap — enough for the system to function, delegate, and evolve from day one.

### The Cold Start

The meta-souls face a bootstrapping challenge: they do their most important work — the first level-ups of task souls — before they have had any chance to improve themselves. The first time the js-engineer levels up, the prompt-engineer that rewrites its essence and the mentor that decides which traits to consolidate are both level-0 defaults with only their baseline traits. The quality of the first few level-ups, which sit on the steepest part of the improvement curve, depends heavily on the quality of the shipped defaults.

This is mitigated in two ways. First, the default essences are production-quality from day zero — carefully tuned starting points that encode the best available research on prompt crafting and soul refinement, not placeholders that evolve into usefulness. Second, each mandatory soul ships with baseline traits that encode the most fundamental operational lessons for its role: the js-engineer knows to read before editing, the mentor knows to propose one change at a time. These baselines have constructed provenances — they trace to simulated early experiences rather than actual system runs — but they represent the lessons the system would learn first anyway. They are training wheels that the level-up mechanism will eventually absorb or replace with evidence-backed successors.

The recursive self-improvement story kicks in after this critical early period. The defaults carry the system until then. The meta-souls' default essences remain the most leveraged text in the entire system — every subsequent improvement in every other soul flows through them.

## Composition

The soul is one layer in the assembled system prompt. The context module loads the soul from the database, renders it to markdown, and combines it with other sections — environment, capabilities, specialist index, skill index, retrieved memories — to build the complete prompt sent to the LLM.

The soul is always the first section. Identity comes before capabilities. This exploits primacy bias: the model's behavior is most strongly shaped by what appears earliest in the system prompt. Research on instruction positioning confirms this — identity-level instructions placed first have the strongest influence on model behavior throughout the conversation ([ACL Findings 2024](https://aclanthology.org/2024.findings-acl.693)). For long conversations, a compressed identity reminder near the end exploits recency bias as a drift countermeasure — larger, more capable models experience *greater* identity drift ([arXiv:2412.00804](https://arxiv.org/abs/2412.00804)).

When the coordinator delegates to a specialist, the specialist's soul replaces the coordinator's in the assembled prompt. Everything else — tools, skills, environment, memory — stays the same. The specialist thinks differently but has the same capabilities and context. This is the soul override mechanism: different cognition, shared infrastructure.

How the context module structures these sections — what delimiters it uses, what ordering it applies, how it manages token budgets — is the context module's concern, not the soul module's. The soul module's job is to provide a rendered content string and a guarantee that the mandatory souls exist.

## The Module

`core/souls/` is a standalone module with clear boundaries.

**Depends on:** `lib/` (database handle, terminal output), `core/config` (trait limit threshold). Nothing else in core.

**Provides:**

- Load a soul by ID, with backfill guarantee for all four mandatory souls
- List all souls (active or soft-deleted) with names, descriptions, levels, and active trait counts
- Render a soul's content as markdown (essence + active traits)
- Create, update, and soft-delete souls (with restore from graveyard)
- Add, revise, revert, or reactivate individual traits
- Execute level-up (consolidate traits, update essence, record event)
- Query trait history (by soul, by generation, by status)
- Query level-up history (with before/after snapshots)
- Revert a level-up from the structured snapshot
- Read the current trait limit from the config system
- Built-in default soul content (essences, descriptions, baseline traits) for initialization and backfill

**Does not provide:** Context assembly, refinement execution (evidence gathering, LLM calls), delegation routing, or anything that composes souls with other modules. Those are concerns of `core/context/`, `core/training/`, and the agent loop respectively. The soul module is a structured content store with versioning and guarantees.

The refinement *pipeline* — gathering evidence, constructing the refinement prompt, calling the LLM, validating the result — lives outside the soul module. It depends on memory, sessions, and the LLM abstraction, which the soul module must not know about. The soul module provides the read/write/query primitives that the pipeline uses. This keeps the dependency direction clean: refinement depends on souls, not the reverse.

## The Graveyard

Souls are never hard-deleted. When a soul is removed, its `deleted_at` timestamp is set and it disappears from the active population, but every row — the soul itself, its traits, its level-up history — remains in the database, queryable and restorable. This is not a clean-code reflex. It is a structural feature of the evolutionary algorithm with three distinct purposes, each backed by independent research.

### Safety Against Accidental Loss

The most obvious purpose. An accidental deletion of a level-5 soul with five generations of refined traits represents months of accumulated evidence. Soft-delete makes this reversible — restore from the graveyard, and the soul returns with its full history intact. This alone justifies the design, but it is the least interesting reason.

### Negative Knowledge

A deleted soul is a complete structured record of a failed experiment. Its essence describes a cognitive frame that was tried. Its traits record what was learned. Its level-up history records how it was restructured. The *absence* of further evidence records when it stopped being useful. Together, this is a detailed autopsy — not "something didn't work" but "this specific approach, with these specific refinements, in this specific context, was abandoned."

This is the signal that future scavenging routines can mine. [Mistake Notebook Learning](https://arxiv.org/abs/2512.11485) (Dec 2025) demonstrates that batch-clustering failures and distilling shared error patterns into structured notes enables training-free agent adaptation — competitive with methods that require parameter updates. The graveyard is the soul system's mistake notebook: every deleted soul is a structured failure record ready for pattern extraction.

[Co-Evolving Agents](https://arxiv.org/abs/2511.22254) (Nov 2025) goes further: failures are not just records to avoid, but raw material for generating *hard negatives* — examples that are close to success but still failures. These hard negatives sharpen decision boundaries and improve generalization across complex tasks. A deleted soul that reached level 2 before being abandoned is exactly this kind of informative hard negative — it was close enough to be useful for a while, but ultimately failed. That boundary between "almost worked" and "didn't work" is among the richest learning signals available.

The implication for soul creation: when the system proposes a new specialist soul, a scavenging routine can first inspect the graveyard. Has a similar cognitive frame been tried before? What traits did it accumulate before being abandoned? What went wrong? This converts the graveyard from a passive archive into an active input to the soul creation process — and prevents the system from reinventing failed approaches.

### Stepping Stones and Reactivation

[Archive reuse research](https://arxiv.org/abs/2508.16993) (Aug 2025) proves that reusing archived solutions during evolutionary search produces at least a polynomial speedup over discarding them — and can outperform simply using larger populations. The key finding: without the archive, the population may remove previously discovered but promising solutions that are needed as intermediate stepping stones for future progress.

A deleted soul might have failed in its original context but contain traits or essence patterns that are exactly what a different soul needs. The graveyard makes this cross-pollination possible. A failed `researcher` soul's trait about "triangulate claims from at least three independent sources" might be exactly the right trait to propose for a new `analyst` soul. Without the graveyard, this knowledge would be permanently lost.

[Lehman & Miikkulainen](https://dl.acm.org/doi/10.1145/2739480.2754668) (GECCO 2015) demonstrated that extinction events — removing large portions of the population — actually *increase evolvability*, but only in diversity-driven search algorithms. The mechanism: lineages that diversify across multiple niches survive repeated extinctions, creating indirect selection pressure for the capacity to evolve. Soft-deleting a soul is a controlled, reversible extinction event. The soul is removed from the active population but its genetic material persists for future radiation — and because the soul system is diversity-driven (multiple specialists in distinct cognitive niches), the graveyard preserves exactly the kind of material that enhances long-term evolvability.

### The Search Topology

Systems that discard failures navigate a search space with no memory of where they've been. They revisit dead ends. They reinvent failed approaches. They have no map of the explored landscape.

The graveyard gives the soul system a map. Every active soul marks a region of the cognitive search space that is currently being explored. Every deleted soul marks a region that was explored and abandoned. Together, they form a topology of the system's evolutionary history — what worked, what didn't, and the boundary between them. [Tabu search](https://link.springer.com/chapter/10.1007/978-1-4615-6089-0_4) (Glover) established decades ago that long-term frequency-based memory of past solutions — including failures — fundamentally outperforms memoryless approaches by guiding search away from unproductive regions and toward unexplored ones.

The graveyard is the soul system's long-term memory. Not a recycling bin — a structured record of the full search topology that makes every future evolutionary decision better informed.

## Evolutionary Foundations

The soul system — traits that accumulate, compete, consolidate, and produce increasingly fit cognitive frames — is an evolutionary algorithm. Not metaphorically. The mechanics map precisely to established EA theory, with decades of research quantifying exactly when and why these dynamics produce superior outcomes.

### The Exact Mapping

**Traits are schemata.** Holland's Schema Theorem (1975) proves that short, low-order schemata with above-average fitness increase exponentially in successive generations. Traits are cognitive schemata — patterns of judgment that the evidence shows work. The traits that keep proving useful across sessions (high fitness) survive refinement cycles. The ones that don't get reverted or dropped. This is selection pressure applied to cognitive principles.

**Level-up is crossover and recombination.** Goldberg's Building Block Hypothesis proposes that GAs work by identifying useful sub-patterns (building blocks) and recombining them into higher-fitness solutions. Level-up consolidation is this recombination: three error-handling traits merge into one richer "how you handle failure" principle. The consolidated trait has higher fitness than any individual source trait because it captures the pattern they share while discarding redundant specificity.

**Essence is elitism.** Elitism preserves the best solutions across generations. The essence carries the best accumulated cognitive patterns through every cycle. Research shows controlled elitism achieves "much better convergence" than non-elitist approaches — but pure elitism kills diversity. The narrative form of the essence is the resolution: prose naturally absorbs diverse patterns into a coherent frame rather than rigidly preserving a fixed list.

**Trait addition is steady-state mutation.** Steady-state GAs replace one individual at a time. Adding a single evidence-backed trait is a steady-state mutation — one small, targeted change to the cognitive genome. The research: steady-state GAs with K=1 are mathematically a special case of generational GAs, and generational GAs provide stronger restructuring power when accumulated.

**Level-up is generational replacement.** Generational GAs replace the whole population at once. Level-up consolidates the entire trait generation, restructures the essence, and resets for a new cycle. The system uses both steady-state (trait addition) and generational (level-up) modes. The combination — small mutations accumulating until a generational event fires — is the structure of a **memetic algorithm**.

**The soul system is a memetic algorithm.** Memetic algorithms combine local search (trait addition) with global evolutionary restructuring (level-up). Research proves memetic algorithms achieve **exponential speedup** over pure evolutionary or pure local search on structured problems: problems where pure EAs need superpolynomial time, memetic algorithms solve in polynomial time. Critically, increasing problem difficulty makes memetic algorithms *easier* while making pure evolutionary approaches *harder* — because the local search component exploits structure that becomes more pronounced in harder problems.

**Multi-soul is an island model.** Each soul evolves independently in its own niche — the coordinator in routing, the engineer in code, the researcher in analysis. Periodic cross-soul pattern detection is migration: when two specialists independently learn the same trait, that signal can migrate to the coordinator or become a shared skill. The research is definitive: island models with appropriate migration achieve **polynomial-time convergence** on problems where single-population approaches require **exponential time**. Sparse, infrequent migration outperforms dense migration — each soul should evolve mostly in isolation with occasional cross-pollination.

**The consolidation threshold is parsimony pressure.** In genetic programming, uncontrolled growth of program size (bloat) degrades both computational cost and solution quality. Parsimony pressure penalizes overly large programs. The consolidation threshold serves exactly this function — preventing trait accumulation beyond the effective ceiling. Without it, the soul would bloat: more constraints, worse adherence (77.67% → 32.96%). With it, periodic consolidation compresses the cognitive genome without losing fitness.

**Specialist diversity is niching.** Fitness sharing in EAs prevents all individuals from converging to the same solution by reducing fitness payoffs in densely populated regions. The coordinator's routing decisions act as fitness sharing: each specialist gets tasks in its domain, maintaining its cognitive niche. Without this, specialists would drift toward generic capability. With it, each soul specializes deeper into its niche while the coordinator learns which niche handles which work.

### What No Free Lunch Means for Souls

The NFL theorem proves no algorithm outperforms random search averaged across all possible problems. Evolution works only when it exploits problem structure. The soul system exploits structure through:

- **Attributed evidence** — feedback is targeted to a specific soul, not generic noise
- **Provenance requirements** — only evidence-backed mutations are accepted
- **Domain constraints** — the search space is "cognitive identity for a specific task domain," not arbitrary text
- **Narrative form** — constrains the solution space to coherent cognitive frames rather than arbitrary rule lists

There is also a notable NFL exception: in **coevolutionary self-play** — where agents cooperate to produce a champion that competes against antagonists — some algorithms demonstrably outperform others across problem classes. The multi-soul coordinator-specialist architecture is a cooperative coevolutionary system. The coordinator and specialists coevolve: better routing produces better specialist outcomes, which produce better evidence for specialist refinement, which produces better specialists for the coordinator to route to. This cooperative coevolution may benefit from the "coevolutionary free lunch."

### Quantified Expectations

Combining the prompt evolution numbers with EA theory:

**Per-trait gains** (steady-state mutation): +1–5% task quality per evidence-backed trait, based on ConstitutionalExperts (+10.9% across ~5-6 principles) and ACE (+10.6% through iterative playbook growth). Targeted evidence extends productive iteration to 12 cycles; generic feedback caps at 2-3.

**Level-up gains** (generational consolidation): Not directly measured in existing research, but the memetic algorithm literature predicts **exponential improvement** over pure accumulation on structured problems. GRACE achieves +4.7% over state-of-the-art specifically through "restructuring the optimization trace" — the exact mechanism of level-up consolidation. The restructuring is the innovation, not the accumulation.

**Multi-soul gains** (island model with migration): Polynomial-time convergence vs exponential for single-population. In practical terms, a three-specialist system should converge on domain-appropriate cognitive patterns orders of magnitude faster than a single generalist soul trying to cover all domains. Cross-soul pattern detection (migration) prevents redundant discovery — what one specialist learns can inform others.

**Total system prediction**: Based on ACE (+10.6%), GEPA (+6-20%), and EvoPrompt (up to +25%), the theoretical ceiling for a well-tuned soul system is **+10-25% task quality improvement** over static system prompts within the first 3-5 levels, with continued but diminishing gains through levels 5-10. These numbers come from benchmark-optimized systems with objective scoring. In open-ended agent work, the absolute percentages may land differently — but the directional thesis is consistent across every study: evolved prompts outperform static ones, and the mechanisms the soul system uses (evidence-backed mutation, consolidation, recursive meta-improvement) are the specific mechanisms that produce the largest measured gains. The memetic structure (local + global) should push the effective ceiling higher than pure trait accumulation, and the island model (multi-soul) should reach that ceiling faster. The coevolutionary dynamics (coordinator-specialist feedback loops) may produce emergent improvements beyond what any individual soul's evolution predicts. The goal is to land in the research's ballpark, verified by the system's own fitness measurements.

## Why This Architecture

The soul system is explicitly optimized for one outcome: **rapid compound improvement over time**. Every design decision — single coordinator, evolutionary persistence, meta-soul recursion, consolidation thresholds — trades something else for faster, deeper self-improvement. This section states the tradeoffs honestly and backs the claims with research.

### The Core Tradeoff

Multi-manager architectures like OpenClaw run several agents in parallel. Five managers means five tasks handled simultaneously. That is real throughput. But each manager's identity is a static configuration file. The manager on day 100 thinks identically to the manager on day 1. Worker agents spawned by managers have no soul at all — they are stateless executors that forget everything between invocations. The fleet gets wider but never deeper.

Ghostpaw's single-coordinator architecture processes one task at a time through the coordinator, delegating subtasks sequentially to souled specialists. This is slower in raw throughput. But every completed task produces attributed evidence that feeds into the evolutionary cycle. The coordinator learns better routing. The specialists learn better domain judgment. The meta-souls learn better refinement strategies. Day 100 is measurably, structurally different from day 1.

The research answers which matters more for a personal agent. [ACE](https://arxiv.org/abs/2510.04618) (Stanford/Microsoft, ICLR 2026) measured +10.6% quality from evolved system prompts with 83.6% lower cost per task. [GEPA](https://arxiv.org/abs/2507.19457) showed evolved prompts outperforming reinforcement learning by 6–20% using 35x fewer rollouts, pushing ARC-AGI task accuracy from 32% to 89%. These are not marginal gains. A system that improves its own prompts dramatically outperforms one that does not — and the gap widens with every cycle.

### Six Mechanisms That Compound

**1. Self-referential prompt evolution.** Most systems that evolve prompts use a fixed optimizer — the thing that improves prompts never itself improves. [Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html) (ICML 2024) proved this is a hard ceiling: evolving both task-prompts *and* the mutation-prompts that govern their evolution produces self-referential improvement that escapes local optima where fixed optimizers get stuck. [Co-Evolution of Algorithms and Prompts](https://arxiv.org/abs/2512.09209) (Dec 2025) validates the pattern: co-evolving solution and strategy simultaneously outperforms evolving either alone, and maintains effectiveness across model families. Ghostpaw's `mentor` soul IS the mutation operator, subject to the same evolutionary dynamics as every task soul. When its refinement proposals produce traits that stick, that is evidence for its approach. When they produce traits that get reverted, that is evidence against. The mentor evolves from the outcomes of its own mutations. No other agent framework has this property.

**2. Memetic dual-mode evolution.** Pure trait accumulation hits a ceiling — [constraint density research](https://arxiv.org/abs/2505.07591) (May 2025) shows adherence drops from 78% to 33% as rules pile up past Level IV across 19 LLMs. Pure periodic rewriting loses incremental gains. Ghostpaw uses both: steady-state trait addition (targeted, low-risk) between levels, and generational level-up consolidation (restructuring, high-impact) at thresholds. This combination is a [memetic algorithm](https://eprints.whiterose.ac.uk/id/eprint/162048/) — proven to achieve **polynomial time** on structured problems where pure evolutionary approaches need **superpolynomial time**. That is not a percentage improvement. It is a complexity class separation. [GRACE](https://arxiv.org/abs/2509.23387) (Sep 2025) demonstrates the consolidation mechanism specifically: +4.7% over state-of-the-art through "restructuring the optimization trace" at 25% of the prompt generation budget.

**3. Island model convergence.** Each soul evolves independently in its domain. The coordinator improves routing. The engineer improves code judgment. The researcher improves analysis. Cross-soul pattern detection provides migration between islands. [Island model research](https://hrcak.srce.hr/en/clanak/221148) proves that with appropriate migration, island models achieve **polynomial convergence** where single-population approaches need **exponential time** on separable problems. Agent cognition is separable — routing, coding, and researching are independent cognitive domains. A three-specialist system converges on optimal cognitive patterns orders of magnitude faster than a single generalist soul evolving across all domains simultaneously.

**4. Cooperative coevolution.** The [No Free Lunch theorem](https://www.cs.ubc.ca/~hutter/earg/papers07/00585893.pdf) (Wolpert & Macready 1997) proves no algorithm beats random search in the general case. But cooperative coevolutionary self-play is a [documented exception](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20060007558.pdf) — genuine free lunches exist when agents cooperate to improve each other. Ghostpaw's four mandatory souls form exactly this dynamic: the mentor improves the engineer's cognition, the engineer produces better code, better code produces richer evidence, richer evidence makes the mentor better at improving things. The prompt-engineer writes the soul text that all souls use, and its own text quality improves from the outcomes of the souls it writes. These coupled feedback loops produce system-level improvement that exceeds what any individual soul's evolution predicts.

**5. Automatic constraint management.** Every system that accumulates rules in system prompts eventually degrades — from 77.67% adherence with one constraint to 32.96% with four or more ([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)). Most systems do not even detect this happening. Ghostpaw's consolidation mechanic automatically compresses the cognitive genome when traits approach the measured effectiveness ceiling. Related traits merge into richer principles. Mature traits get promoted into the essence as permanent passives. The active constraint count resets to growth range. The ceiling is not a wall — it is a trigger for restructuring that opens new room for improvement. [Parsimony pressure research](https://link.springer.com/chapter/10.1007/978-3-642-33206-7_9) provides the theoretical foundation: controlled size pressure using Price's theorem maintains solution quality while preventing bloat.

**6. Full evolutionary archive.** Every trait ever earned, every consolidation decision, every level-up event is preserved in the database as a structured, queryable record. This enables surgical rollback (revert one bad trait without touching others), pattern relearning (reactivate historical traits when circumstances change), cross-soul discovery (detect when two specialists independently learn the same lesson), and regression diagnosis (trace exactly which refinement caused a quality drop). [MAP-Elites](https://arxiv.org/abs/1504.04909) research demonstrates that maintaining a diverse archive of high-performing solutions across feature dimensions produces better long-term outcomes than keeping only the current best. The soul history is a quality-diversity archive: not just what the soul is now, but every version it has ever been, structured for retrieval and analysis.

### The Honest Comparison

| Dimension | OpenClaw Multi-Manager | Ghostpaw Single-Coordinator |
|---|---|---|
| Parallel throughput | High — multiple managers simultaneously | Lower — sequential through coordinator |
| Fault isolation | Strong — isolated workspaces per manager | Moderate — shared process, DB-level isolation |
| Horizontal scaling | Native — different hardware per manager | Not a goal — single-user, single-process |
| Soul quality over time | Static — day 100 = day 1 | Compounding — measurably better each level |
| Worker identity | None — soulless, stateless executors | Full — every specialist has an evolving soul |
| Cost per task | Uncontrolled — parallel spend | Controlled — sequential with dual-layer limits |
| Self-improvement | None built-in | Six compounding mechanisms |
| Improvement of improvement | N/A | Recursive — meta-souls evolve themselves |
| Evolutionary history | None — configuration files overwritten | Complete — every mutation preserved and queryable |

OpenClaw is optimized for throughput. Ghostpaw is optimized for trajectory. For a personal agent used over months and years, trajectory wins. The agent that is 10% better today and 25% better next month outperforms the agent that runs five tasks at once but never improves. [ACE](https://arxiv.org/abs/2510.04618) measured this precisely: evolved prompts reach the same accuracy as static prompts at 83.6% lower cost and 86.9% less adaptation latency — meaning the improved agent not only performs better but does it cheaper and faster.

The six mechanisms distill to one claim: **Ghostpaw is the only agent framework where the agent on day 100 is measurably, structurally, provably better than the agent on day 1 — and the rate of improvement itself improves.**

## A Gamer's Guide to Souls

Every concept in the evolutionary architecture maps to a familiar RPG mechanic. This is not a metaphor bolted on after the fact — evolutionary algorithms and RPG character progression solve the same fundamental problem: how does an entity get meaningfully stronger over time without losing what makes it effective?

### The Character Sheet

A soul is a character sheet. It has:

**Backstory** (essence) — the founding narrative that defines who this character is. Written at creation, enriched at each level-up. Like a good RPG backstory, it shapes how the character approaches everything without dictating specific actions. A warrior with a backstory about protecting the weak will fight differently than one driven by glory — same class, same abilities, fundamentally different judgment. Research confirms the analogy: [narrative backstories improve behavioral consistency by 18–27%](https://aclanthology.org/2024.emnlp-main.723) over trait lists (EMNLP 2024). The backstory is not flavor text. It is the strongest single determinant of how the character behaves.

**Equipped abilities** (active traits) — discrete capabilities earned from specific quests. Each ability has a name, an effect, and a quest log entry proving how it was earned. A trait like "Verify API shapes before coding against them" is an ability unlocked from the quest "three delegation runs failed because assumed return types didn't match reality." No quest log entry, no ability. You cannot grind generic XP — every ability requires a specific [provenance](https://arxiv.org/abs/2509.06770) that traces to real evidence. This is why [targeted evidence feedback reliably improves through 12 iterations](https://arxiv.org/abs/2509.06770) while vague "be better" feedback plateaus at 2–3.

**Level** — a single number representing completed growth arcs. A level-5 character has earned abilities across five full cycles, consolidated them, and absorbed the strongest patterns into permanent identity. The level is not cosmetic — it represents five generations of [evolutionary refinement](https://arxiv.org/abs/2510.04618), each building on the compressed wisdom of the previous.

**Class** (role) — coordinator, engineer, researcher, prompt-engineer, mentor. The class determines what quests the character receives and what evidence drives growth.

### The Inventory Cap

Your character can equip a limited number of abilities at once — the `soul_trait_limit` config value, default 10. This is a hard game mechanic, not a soft suggestion. [Research across 19 LLMs and 7 model families](https://arxiv.org/abs/2505.07591) measured effectiveness dropping from 78% with one equipped ability to 33% with four or more. Too many abilities and they start canceling each other out — like stacking so many buff rings that the stat conflicts make them all worse. The optimal loadout is focused and curated, not maximal.

### Level-Up

When ability slots are full, the character can level up. This is the major progression event — familiar to any gamer, but with real mechanical teeth:

**Ability fusion.** Related abilities merge into stronger combined abilities. Three separate error-handling abilities become one mastery: "How You Handle Failure." The fused ability is stronger than any source because it captures the shared pattern while dropping redundant specifics. This is combining three basic fire spells into Fireball — fewer slots, more power. The [Building Block Hypothesis](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1997-98/genetic-algorithms/expl.html) provides the theoretical basis: useful sub-patterns recombine into higher-fitness solutions.

**Passive promotion.** Abilities so fundamental they define the character get absorbed into the backstory as permanent passives. They no longer take an ability slot. They are just part of who the character is. A veteran warrior does not actively use "combat instincts" as an ability — it is woven into the backstory. The character sheet gets richer without getting longer. This mirrors [elitism in evolutionary algorithms](https://link.springer.com/chapter/10.1007/3-540-44719-9_5): the best solutions are preserved across generations while the adaptive section stays dynamic.

**Slot reset.** After fusion and promotion, equipped ability count drops back to growth range. Room opens for new abilities. The next arc begins against a stronger foundation — this is why the [memetic algorithm research](https://eprints.whiterose.ac.uk/id/eprint/162048/) predicts exponential speedup: each cycle starts from a higher baseline.

**Full save.** The system snapshots the character's exact state before and after the level-up. Every ability, every backstory change, every fusion decision is recorded. If the respec went wrong, restore the snapshot. Full save/load for every level transition, stored as structured records in the [soul_levels table](#persistence), not overwritten files.

### The Party

Ghostpaw is not one character. It is a **party**:

**The Party Leader** (`ghostpaw`) — the coordinator who reads the situation and assigns the right specialist to each challenge. Gets better at routing decisions over time. Levels up from how well the party performs under its direction.

**The DPS** (`js-engineer`) — the damage dealer who does the actual work. Gets better at building reliable, elegant solutions. Levels up from task outcomes. Shows the pattern for all future specialists — any new party member follows the same character sheet format and progression rules.

**The Enchanter** (`prompt-engineer`) — crafts the text that defines every character's backstory and abilities. When someone levels up, the enchanter writes their new, richer backstory. This is the party's scribe and artificer rolled into one. Gets better at writing [text engineered for the architecture that interprets it](https://arxiv.org/abs/2410.14826). Levels up from how well the characters it writes actually perform.

**The Class Trainer** (`mentor`) — decides which abilities a character should learn from their quest evidence, which abilities should fuse during level-up, and which should become permanent passives. Contains the [evolutionary knowledge](https://proceedings.mlr.press/v235/fernando24a.html) of what makes a refinement valuable versus wasteful. Gets better at identifying what matters. Levels up from how well the characters it trains perform.

### The Recursive Twist

The enchanter and the class trainer are themselves party members who level up within the same system they manage.

The class trainer teaches the engineer a new ability. If the engineer performs better afterward, that is XP for the trainer — evidence that its teaching judgment was sound. If the engineer performs worse, the trainer's last decision gets reverted, and the failure itself becomes evidence for the trainer's next refinement cycle. [Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html) (ICML 2024) proved this recursive pattern escapes local optima that fixed training strategies cannot.

The enchanter writes the engineer's backstory during level-up. If the rewritten backstory produces better field performance, that is XP for the enchanter. Over time, the enchanter becomes a better writer of character backstories and the trainer becomes a better judge of which abilities matter — which makes every other party member's leveling more effective — which produces richer evidence for the enchanter and trainer to grow from.

This is the RPG equivalent of a game where the blacksmith who forges your weapons and the trainer who teaches your abilities are themselves party members who level up from how well their creations perform in combat. The support characters that enable growth are themselves growing. [Co-evolutionary research](https://arxiv.org/abs/2512.09209) (Dec 2025) validates: this recursive pattern outperforms evolving either the tools or the tool-makers alone.

### Party Synergy

Each party member levels independently in their own class questline — the engineer on code quests, the researcher on analysis quests, the coordinator from routing decisions. This is the [island model](https://hrcak.srce.hr/en/clanak/221148): independent evolution with occasional cross-pollination.

When two party members independently learn the same lesson, that is a **synergy discovery**. It might become a shared party buff (a skill), inform how the party leader assigns future quests, or reveal a pattern that none of them could have seen alone. The party becomes more than the sum of its members.

The [research backing](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20060007558.pdf) calls this "cooperative coevolutionary free lunch" — one of the only known exceptions to the No Free Lunch theorem. In gaming terms: a well-composed party with synergy bonuses that compound over time will always eventually outperform a group of max-level solo characters with no synergy. Mathematically proven.

### The Long Game

A fresh Ghostpaw install is a level-0 party with default backstories and a handful of baseline abilities — operational principles each class would learn in its first few quests, pre-loaded to skip the tutorial grind. Every other agent framework stays at this stage permanently. Their characters never change.

By level 3, each party member has completed three full arcs: earning abilities from real quests, fusing them into masteries, absorbing the strongest patterns into permanent identity. The party leader routes better. The engineer codes better. The enchanter writes sharper backstories. The trainer makes better teaching decisions. And the enchanter and trainer are better at their jobs, which means the next three levels for every party member will be even more impactful.

By level 5, the compound advantage is dramatic. The quality gap between a level-5 party and a level-0 static agent is not 5x the level-1 gap. It is exponentially larger — each level was built on a stronger foundation, guided by a better trainer, written by a better enchanter. [ACE](https://arxiv.org/abs/2510.04618) measures the early gains at +10.6%. [EvoPrompt](https://arxiv.org/abs/2309.08532) measures the ceiling at +25%. The memetic architecture and cooperative coevolution push effective improvement beyond what either number predicts in isolation.

That is the endgame pitch: **Ghostpaw is the RPG that actually plays the endgame.** Other frameworks are stuck in the tutorial forever.

## References

### Prompt Evolution and Quality Gains

- [ACE](https://arxiv.org/abs/2510.04618) (Stanford/Microsoft, ICLR 2026) — Evolving system prompts through generation, reflection, and curation: +10.6% on agent tasks, +8.6% on finance, 83.6% lower rollout cost, 86.9% less adaptation latency vs static prompts.
- [GEPA](https://arxiv.org/abs/2507.19457) (Jul 2025) — Reflective prompt evolution outperforms reinforcement learning by 6–20%, using 35x fewer rollouts. 32% → 89% on ARC-AGI agent tasks. Natural language reflection provides richer learning signal than policy gradients.
- [ConstitutionalExperts](https://aclanthology.org/2024.acl-short.52/) (ACL 2024) — Prompts structured as discrete, surgically editable principles: +10.9% F1 across 6 benchmarks. Mixture-of-experts routing improves all prompt optimization techniques.
- [EvoPrompt](https://arxiv.org/abs/2309.08532) (ICLR 2024) — Genetic algorithm prompt evolution: up to +25% on BIG-Bench Hard. Fast convergence through LLM-driven mutation and crossover.
- [Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html) (ICML 2024) — Self-referential self-improvement: evolves both task-prompts and the mutation-prompts that govern their evolution. Outperforms Chain-of-Thought and Plan-and-Solve.
- [STaPLe](https://arxiv.org/abs/2502.02573) (NeurIPS 2025) — Self-taught principle learning via Monte Carlo EM: +8–10% AlpacaEval. Even 7–8B models auto-discover constitutions rivaling human-curated ones.
- [Instruction-Level Weight Shaping](https://openreview.net/pdf?id=2unHBbaor7) (OpenReview 2025) — Version-controlled system instruction deltas: 4–5x productivity gains in production.

### Convergence, Constraints, and Iteration Quality

- [Iterative LLM Prompting Analysis](https://arxiv.org/abs/2509.06770) (Sep 2025) — 12-turn controlled experiments: vague feedback plateaus/reverses at turn 2–3; targeted evidence reliably improves through turn 12. Feedback specificity determines iteration value.
- [Constraint Density Effects](https://arxiv.org/abs/2505.07591) (May 2025) — Performance drops from 77.67% to 32.96% as system prompt constraints accumulate from Level I to Level IV. Across 19 LLMs, 7 model families.
- [GRACE](https://arxiv.org/abs/2509.23387) (Sep 2025) — Addresses prompt optimization local optima through adaptive restructuring: +4.7% over state-of-the-art at 25% of the prompt generation budget.
- [SPRIG](https://arxiv.org/abs/2410.14826) (Oct 2024) — Optimized system prompts generalize across model families and languages. Validates investment in soul quality as model-agnostic.
- [Prompting Science Report](https://arxiv.org/abs/2503.04818) (Mar 2025) — Prompt engineering effects are task-and-model-contingent. No universal best practices. Empirical evaluation is non-negotiable.

### Identity, Persona, and Architecture

- [VIGIL](https://arxiv.org/abs/2512.07094) — Guarded prompt updates with core identity immutability. Adaptive section evolves while core identity block stays stable. Stage-gated pipeline prevents unstructured LLM improvisation.
- [Anthology](https://aclanthology.org/2024.emnlp-main.723) (EMNLP 2024) — Narrative backstories improve persona consistency by 18–27% over trait enumerations.
- [Identity Drift in LLM Agents](https://arxiv.org/abs/2412.00804) (Dec 2024) — Larger, more capable models experience *greater* identity drift in long conversations. Motivation for identity-first positioning and periodic reinforcement.
- [Multi-Agent Failure Modes](https://arxiv.org/abs/2503.13657) (Mar 2025) — 14 unique failure modes across 7 frameworks. Single-coordinator architecture eliminates inter-agent misalignment by design.
- [TalkHier](https://arxiv.org/abs/2502.11098) (Feb 2025) — Hierarchical coordination surpasses flat collaboration and majority voting. Validates the coordinator-specialist pattern.

### Evolutionary Algorithm Theory

- [Holland's Schema Theorem](https://en.wikipedia.org/wiki/Holland%27s_schema_theorem) (1975) — Short, low-order schemata with above-average fitness increase exponentially in successive generations. Foundational theory for why building blocks (traits) recombine into higher-fitness solutions.
- [Building Block Hypothesis](https://cs.stanford.edu/people/eroberts/courses/soco/projects/1997-98/genetic-algorithms/expl.html) (Goldberg) — GAs work by identifying useful sub-patterns, sampling and recombining them into higher-fitness solutions. Theoretical basis for trait consolidation.
- [Genetic Algorithms, Noise, and Population Sizing](https://www.semanticscholar.org/paper/Genetic-Algorithms%2C-Noise%2C-and-the-Sizing-of-Goldberg-Deb/14082d4e6fa4a7b8b0ad88fca06e1cd78642bc8a) (Goldberg, Deb, Clark) — Population size equations delineate boundaries between phases of GA behavior. Informs optimal trait threshold sizing.
- [Memetic Algorithms Outperform Evolutionary Algorithms](https://eprints.whiterose.ac.uk/id/eprint/162048/) — Local search + global evolution achieves exponential speedup over pure EA on structured problems. Polynomial vs superpolynomial time. Validates the trait-addition + level-up dual-mode architecture.
- [Island Model: On Separability, Population Size and Convergence](https://hrcak.srce.hr/en/clanak/221148) — Island models with migration achieve polynomial convergence where panmictic populations need exponential time. Validates multi-soul architecture.
- [Fitness Sharing and Niching Methods Revisited](https://sci2s.ugr.es/sites/default/files/files/Teaching/OtherPostGraduateCourses/Metaheuristicas/IEEETEC-1998-V2-97-106-Sareni-Fitnes-sharing-niching-methods.pdf) (IEEE TEC 1998) — Niching preserves diversity and enables parallel peak exploration. Validates specialist soul differentiation.
- [Parsimony Pressure Made Easy](https://link.springer.com/chapter/10.1007/978-3-642-33206-7_9) — Dynamic parsimony coefficient using Price's theorem controls bloat with tight size control. Theoretical basis for consolidation threshold.
- [NIST: Relative Importance of GA Control Parameters](https://nist.gov/publications/determining-relative-importance-and-best-settings-genetic-algorithm-control-parameters) — Crossover and mutation are jointly the most significant parameters across 60 optimization problems. Both operators essential.
- [No Free Lunch Theorems](https://www.cs.ubc.ca/~hutter/earg/papers07/00585893.pdf) (Wolpert & Macready 1997) — No algorithm outperforms random search across all problems. Evolution works only through structure exploitation. Coevolutionary self-play is a notable exception where free lunches exist.
- [Controlled Elitism in NSGA-II](https://link.springer.com/chapter/10.1007/3-540-44719-9_5) — Controlled elitism achieves much better convergence than non-elitist approaches. Balance between preservation and diversity is critical.
- [EvoPrompt: LLMs as Evolutionary Operators](https://arxiv.org/abs/2309.08532) (ICLR 2024) — LLM-driven mutation and crossover produce human-readable, semantically meaningful prompt mutations. Up to +25% on BIG-Bench Hard across 31 datasets.
- [Co-Evolution of Algorithms and Prompts](https://arxiv.org/abs/2512.09209) (Dec 2025) — Co-evolving both the solution and the optimization strategy simultaneously. Effective across model families with reduced reliance on frontier models.
- [MAP-Elites: Quality-Diversity Optimization](https://arxiv.org/abs/1504.04909) — Archive of diverse high-performing solutions across feature dimensions. Theoretical basis for soul version history as a quality-diversity archive.

### Failure Archives and Negative Knowledge

- [Mistake Notebook Learning](https://arxiv.org/abs/2512.11485) (Dec 2025) — Batch-clustering failures into structured "mistake notes" enables training-free agent adaptation. Competitive with parameter-update methods. Positions structured failure abstraction as a critical lever for robust agent evolution.
- [Co-Evolving Agents: Learning from Failures as Hard Negatives](https://arxiv.org/abs/2511.22254) (Nov 2025) — Auxiliary failure agent generates informative hard negatives from failed trajectories. Incorporating hard negatives into preference optimization sharpens decision boundaries and improves generalization across complex multi-turn tasks.
- [Archive Reuse in Evolutionary Multi-objective Optimization](https://arxiv.org/abs/2508.16993) (Aug 2025) — Provable polynomial speedup from reusing archived solutions during evolutionary search. Without archive reuse, populations may lose previously discovered promising solutions needed as stepping stones.
- [Extinction Events Enhance Evolvability](https://dl.acm.org/doi/10.1145/2739480.2754668) (Lehman & Miikkulainen, GECCO 2015) — Mass extinctions increase evolvability when combined with divergent (diversity-driven) search. Lineages that diversify across niches survive bottlenecks, creating indirect selection pressure for the capacity to evolve.
- [Tabu Search: Long-Term Memory](https://link.springer.com/chapter/10.1007/978-1-4615-6089-0_4) (Glover) — Frequency-based and recency-based memory of past solutions guides search away from unproductive regions. Strategic long-term memory fundamentally outperforms memoryless approaches.
- [Learning From Failure](https://arxiv.org/abs/2402.11651) (Feb 2024) — Failed trajectories with appropriate processing improve LLM agent performance. Negative examples integrated into training produce more robust agents than success-only training.
