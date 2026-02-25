# Scent

A wolf doesn't memorize facts. It catches scents — impressions that are strong or faint, fresh or stale. Scents fade without reinforcement. A fresh trail rekindles them. Contradictory scents are a signal, not a problem. The wolf trusts its nose above all else, and its nose is honest: a faint scent is presented as faint, not as certainty.

Ghostpaw works the same way. The ghost doesn't store facts in a database. It maintains **scents** — beliefs about its world, each carrying a confidence level that decays over time without reinforcement and strengthens with confirmation. This isn't memory with a score column. It's a fundamentally different relationship with knowledge: the ghost knows what it knows, how sure it is, and when it should re-check.

## Why Not Memory

Most agent memory systems store flat text as permanent facts:

```
"User prefers tabs"
"The API rate limit is 100 req/s"
"Deploy command is make deploy"
```

These sit in a database forever, treated equally regardless of when they were recorded, how many times they were confirmed, or whether reality has since changed. A correction from 6 months ago has the same weight as one from today. Two contradictory memories coexist silently. The agent presents everything with equal confidence because it has no way to distinguish certainty from vague recollection.

This is what cognitive science calls **epistemic rigidity** — the inability to revise outdated understanding. An Artificial Brain Labs [whitepaper on belief decay](https://doi.org/10.5281/zenodo.18203372) puts it sharply:

> "Memory stores information. Belief stores epistemic commitment. Humans routinely lose confidence in beliefs they still remember, and remember propositions they no longer believe. Most AI systems conflate memory and belief, preventing natural confidence decay and adaptive uncertainty."

The scent system resolves this. Every piece of knowledge the ghost holds is an active belief that decays, strengthens, gets revised, or gets superseded — just like a scent in the real world.

## Three Forces

Every scent is governed by three forces, continuously:

**Intrinsic decay.** Without reinforcement, confidence fades. "User's favorite dish is pasta" starts strong, but after 6 months without any mention of pasta, its influence drops. Not deleted — faded. Like an actual scent in the woods: still there, but fainter. This prevents epistemic fossilization. The ghost doesn't cling to stale assumptions forever.

**Evidence-weighted reinforcement.** Each time a scent is confirmed — by the user repeating it, by the ghost observing it directly, by the training pipeline extracting it again — confidence rebounds and the freshness timestamp resets. Well-evidenced scents resist contradiction: a belief confirmed 8 times over 3 months doesn't flip because of one ambiguous signal. The math is exponential moving average (EMA): `new_confidence = α × signal + (1 - α) × old_confidence`. Repeated reinforcement builds inertia.

**Evidence integration.** New information updates existing scents or creates competing ones. "The API returns JSON" at confidence 0.8 encounters "The API now returns protobuf" at confidence 0.9 from a fresh observation → the old scent is superseded, not deleted. The revision chain is preserved. The ghost can see its understanding evolved.

These three forces — decay, reinforcement, integration — explain learning, forgetting, rigidity, and revision within a single system. They're supported by decades of empirical psychology (Ebbinghaus forgetting curves, belief perseverance research, Bayesian updating) and directly implemented in recent agent architectures.

## What a Scent Looks Like

```
Scent {
  id:              "sc_7kx..."
  claim:           "User prefers TypeScript for new projects"
  embedding:       [0.12, -0.34, ...]       -- trigram-hash vector, same as before
  confidence:      0.85                      -- 0.0 to 1.0, EMA-tracked
  evidence_count:  4                         -- how many times reinforced
  created_at:      1708300000000             -- when first formed
  verified_at:     1740400000000             -- when last reinforced
  source:          "explicit"                -- how it was formed
  superseded_by:   null                      -- FK: the scent that replaced this
}
```

Compare to the old memory:

```
Memory {
  id:         "mem_9ab..."
  content:    "User prefers TypeScript for new projects"
  embedding:  [0.12, -0.34, ...]
  created_at: 1708300000000
  source:     "agent"
}
```

Same footprint. Richer metadata. The confidence and evidence fields are what make the difference between "I know this" and "I believe this with 85% confidence based on 4 observations."

## Source-Weighted Initial Confidence

Not all scents start at the same strength. The origin determines the initial confidence:

```
explicit     0.9     User stated it directly: "Remember, I prefer tabs"
observed     0.8     Ghost verified it: read the file, ran the command, saw the result
absorbed     0.6     Extracted from a conversation by the training pipeline
inferred     0.5     Ghost concluded it from indirect evidence
```

A user correction always enters strong. An inference from a tangential conversation enters weak. This means user-stated beliefs naturally dominate ghost-inferred ones, which is exactly right. Over time, reinforcement can elevate any scent regardless of source — an inference confirmed 5 times becomes as trusted as a direct observation.

## How Tracking Works (Recall)

Tracking is the wolf following a scent trail. Semantically identical to the old recall — you search by meaning — but the ranking formula changes.

**Old ranking:**
```
score = 0.85 × similarity + 0.15 × recency(created_at)
```

**New ranking:**
```
score = similarity × confidence × freshness(verified_at)
```

This means:
- High-confidence, recently-verified, relevant scents rank highest
- Old but well-established scents still surface (high confidence compensates for age)
- Low-confidence scents rank lower even if semantically close
- Very stale scents (unverified for months) naturally drop without being deleted

The ghost sees its tracking results with full metadata:

```
[strong]  "User prefers TypeScript for new projects"
          confidence: 0.85  evidence: 4×  source: explicit  verified: 2w ago

[fading]  "The API rate limit is 100 req/s per IP"
          confidence: 0.55  evidence: 1×  source: observed  verified: 6w ago

[faint]   "Deploy command is make deploy"
          confidence: 0.3   evidence: 1×  source: inferred  verified: 3mo ago
```

The ghost naturally calibrates its responses. States the TypeScript preference as fact. Hedges on the rate limit. Flags the deploy command as uncertain. Not because it was told to be cautious — because the scent strengths guide its judgment organically.

## How Marking Works (Remember)

When the ghost picks up a new scent — from the user, from observation, from training — it doesn't just store it. It checks whether this scent matches an existing one.

**Three outcomes:**

**Reinforcement.** The new scent matches an existing one semantically and directionally (same claim). → Boost existing scent's confidence via EMA. Increment evidence count. Update `verified_at`. No new row needed.

```
Existing: "User prefers TypeScript"  confidence: 0.7  evidence: 2×
New:      user uses TypeScript happily in session
Result:   confidence: 0.8  evidence: 3×  verified_at: now
```

**Revision.** The new scent contradicts an existing one (opposite claim, high semantic similarity). → Store the new scent. Set `superseded_by` on the old scent pointing to the new one. Preserve the chain.

```
Existing: "User prefers TypeScript"  confidence: 0.8  evidence: 4×  (6 months old)
New:      "User said they're switching to Go"  confidence: 0.9  source: explicit
Result:   old scent gets superseded_by → new scent ID
          both preserved in the DB, new one active
```

**Novelty.** No semantic match. → Store as a fresh scent with source-weighted initial confidence.

The classification (reinforcement vs contradiction vs novel) happens via semantic similarity at storage time. High similarity + same direction = reinforcement. High similarity + opposite direction = contradiction. Low similarity = novel.

## How the Training Pipeline Changes

The absorb phase currently extracts "learnings" and stores them as flat memories. With scent, it extracts **claims** and classifies them:

```
Sessions → extract claims with source type
  → semantic match against existing scents
    → novel:        store as new scent (confidence: 0.6 for absorbed)
    → reinforcing:  boost existing scent's confidence
    → contradicting: store as competing scent, mark supersession
```

The reflect/training phase gains a new power: **contradiction resolution**. The ghost reviews its scents with unresolved contradictions (competing scents in the same semantic space) and resolves them — by investigating, by asking during the next conversation, or by choosing the better-evidenced one. It also reviews stale high-evidence scents and flags them for re-verification.

Skill training becomes more grounded: skills built from high-confidence, well-evidenced scents are more reliable. Skills touching areas where scents are stale or contradicted get flagged for review. The training pipeline can literally answer "how confident am I in the foundation of this skill?"

## Autonomous Maintenance

Six processes that keep the scent store healthy, inspired by the [Belief-Augmented Memory Enzymes](https://clawxiv.org/api/pdf/clawxiv.2602.00032) approach (Feb 2026, deployed in production with 205 beliefs and 3,217 connections):

**Salience-protected decay.** Important, well-evidenced scents decay slower. A scent with evidence_count of 8 fades at a fraction of the rate of a single-observation inference. The formula: `decay_rate = base_rate × evidence_count^(-α)`. Well-established knowledge resists erosion.

**Contradiction detection.** When new scents are stored, existing scents in the same semantic neighborhood are checked for conflict. Contradictions are flagged, not auto-resolved.

**Cluster consolidation.** Related scents about the same topic — "API uses JWT," "JWT tokens expire in 1 hour," "refresh tokens are stored in httpOnly cookies" — get linked. When one is accessed, related scents surface too. During training, dense clusters can be consolidated into a single, richer scent.

**Reinforcement.** Repeated encounters with the same information boost confidence automatically. The ghost doesn't need to explicitly decide to reinforce — it happens at storage time.

**Staleness flagging.** Scents with high evidence count but old `verified_at` get flagged as candidates for re-verification. Useful during haunting: "I was very confident about this 3 months ago — is it still true?"

**Supersession cleanup.** Long chains of superseded scents can be compacted. If A was superseded by B which was superseded by C, and A is very old, it can be archived or purged during tidy cycles.

## How It Composes

**Scent + Pawprints.** Pawprints are external (in the workspace). Scents are internal (in SQLite). A pawprint says "this directory has an N+1 query." A scent says "I'm 70% confident that N+1 query is still there." When the ghost reads a pawprint, it forms or reinforces a scent. When it verifies a scent, it might update the pawprint. External marks, internal beliefs.

**Scent + Haunting.** During autonomous cycles, the ghost can verify stale scents. This transforms haunting from aimless wandering into targeted investigation — verify the most stale, most important scents first. The ghost prioritizes by `evidence_count × staleness` — things it was once sure about but hasn't checked in a while.

**Scent + Skills.** Skills encode procedures. Scents encode the beliefs underlying those procedures. If the scents that informed a skill have decayed significantly, the training pipeline knows to re-evaluate that skill. A skill's effective confidence is bounded by the confidence of the scents it's built on.

**Scent + Souls.** Soul refinement uses delegation outcomes as evidence. Those outcomes update scents about specialist capabilities. The coordinator's beliefs about "the JS engineer handles parsing well" either strengthen or weaken based on real results, which feeds back into routing decisions.

**Scent + Delegation.** The coordinator holds scents about which specialist handles what. Each delegation outcome is a reinforcement or revision signal. Over time, the coordinator's scent map of specialist capabilities becomes highly calibrated.

## The Tool Interface

```
scent mark     "User prefers dark mode"        → creates/reinforces a scent
scent track    "what are user's UI preferences" → searches by meaning, returns scents with confidence
scent fade     <id>                             → supersedes a scent (soft delete)
scent history                                   → list past sessions (unchanged)
```

The tool description in the system prompt changes from "persistent memory that survives across sessions" to something like: "the ghost's nose — pick up scents (beliefs) about the world, track them by meaning, and let them fade when outdated. Scents carry confidence that strengthens with confirmation and weakens with time."

## Research Backing

| Source | Key Finding | Relevance |
|--------|------------|-----------|
| [Belief Decay whitepaper](https://doi.org/10.5281/zenodo.18203372) (Artificial Brain Labs) | "Belief decay is a prerequisite for adaptability." Three forces: decay, reinforcement, integration. | Theoretical foundation for the scent model |
| [Hindsight](https://arxiv.org/abs/2512.12818) (Dec 2025) | Separate "evolving beliefs" from "world facts" — 83.6% vs 39% on long-horizon tasks | Validates beliefs as distinct from flat memory |
| [Belief-Augmented Memory Enzymes](https://clawxiv.org/api/pdf/clawxiv.2602.00032) (Feb 2026) | EMA confidence, evidence-weighted inertia, 6 autonomous maintenance processes. Production-deployed. | Direct implementation precedent |
| [ABBEL](https://arxiv.org/abs/2512.20111) (Dec 2025) | Belief bottlenecks in natural language: 20% task success improvement, 49% memory reduction | Validates concise belief states over full history |
| [Hound](https://arxiv.org/abs/2510.09633) (Oct 2025) | Persistent hypotheses with confidence: 31.2% vs 8.3% recall (3.8× improvement) | Validates hypothesis-confidence tracking in practice |
| [DRN](https://arxiv.org/abs/2508.04339) (Aug 2025) | Uncertainty minimization > probability maximization: 23.6% improvement on TruthfulQA | Validates belief-tracked inference |
| [AGM Framework](https://en.wikipedia.org/wiki/Belief_revision) (1985+) | Formal belief revision: contraction before revision, epistemic entrenchment | Decades of formal theory on optimal belief change |
| [Memento-II](https://arxiv.org/abs/2512.22716) (Dec 2025) | Stateful reflective memory with convergence guarantees as memory grows | Validates memory-as-belief-state with formal properties |
| [MUSE](https://arxiv.org/abs/2411.13537) (NeurIPS 2024) | Metacognitive competence self-assessment improves adaptation in novel situations | Validates agents that know the limits of their knowledge |
| [BREW](https://arxiv.org/abs/2511.20297) (ICLR 2026 submission) | Structured environmental knowledge: 10-20% task precision improvement | Validates structured knowledge over flat storage |

## Schema

```sql
CREATE TABLE scents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  claim TEXT NOT NULL,
  embedding BLOB,
  confidence REAL NOT NULL DEFAULT 0.7,
  evidence_count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  verified_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'absorbed',
  superseded_by TEXT REFERENCES scents(id)
);

CREATE INDEX idx_scents_session ON scents(session_id);
CREATE INDEX idx_scents_confidence ON scents(confidence);
CREATE INDEX idx_scents_verified ON scents(verified_at);
CREATE INDEX idx_scents_superseded ON scents(superseded_by);
```

Migration from the existing `memory` table is straightforward: every existing memory becomes a scent with `confidence: 0.7`, `evidence_count: 1`, `verified_at: created_at`, and `superseded_by: null`. No data loss. Instant upgrade.

## Open Questions

**Decay curve shape.** Linear decay? Exponential? Sigmoid? The Ebbinghaus curve is roughly exponential, but the evidence-weighted inertia (well-evidenced beliefs decay slower) adds a dimension. Needs experimentation.

**Contradiction detection threshold.** How semantically similar do two scents need to be before they're checked for contradiction? Too low and everything contradicts. Too high and real contradictions slip through. Likely needs the LLM to classify "same topic, opposing claim" during absorption.

**Reinforcement vs duplication.** When should the system reinforce an existing scent vs create a new one? A belief stated slightly differently might be a reinforcement or a genuinely distinct scent. The semantic similarity threshold for "same belief" needs tuning.

**Freshness function.** How fast does the freshness factor in the ranking formula decay? 30 days to zero (current recency decay) is probably too aggressive for well-established beliefs. Maybe freshness decay should scale inversely with evidence count — a 4× evidenced scent stays "fresh" longer.

**Supersession chains.** How deep should supersession chains get before compaction? A belief revised 10 times creates a 10-deep chain. At some point, the ancient history is noise. But the chain is also a record of how understanding evolved.

**Cluster boundaries.** When does a cluster of related scents become a skill candidate? If 5+ scents cluster tightly around "how our CI/CD works," that's probably a skill waiting to be written. The training pipeline could detect this.
