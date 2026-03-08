# Memory

Ghostpaw doesn't store facts. It holds beliefs — with confidence that strengthens through evidence, fades with time, and evolves when the world changes. The agent doesn't just know things. It knows *how well* it knows them.

## Why This Matters

Most agent memory systems treat information as permanent, equal-weight facts: "User prefers tabs" sits next to "Deploy command is make deploy" forever, both treated with the same certainty regardless of when they were recorded, how many times they were confirmed, or whether reality has since changed. Two contradictory memories coexist silently. The agent presents everything with equal confidence because it has no way to distinguish certainty from vague recollection.

Ghostpaw's memory system makes a distinction that humans make naturally: every memory carries a confidence score that the system maintains automatically. A user correction enters strong. An inference from a passing remark enters weak. Memories that get confirmed repeatedly resist forgetting. Memories that go unmentioned for months gradually lose influence — not deleted, just faded. The result is an agent that calibrates its certainty against real evidence instead of clinging to stale assumptions.

Research backs this up. [Hindsight](https://arxiv.org/abs/2512.12818) (Dec 2025) shows that structuring agent memory into distinct networks for facts, experiences, and evolving beliefs lifts accuracy from 39% to 83.6% on long-horizon benchmarks. [ABBEL](https://arxiv.org/abs/2512.20111) (Dec 2025) demonstrates that concise belief states with confidence tracking achieve 20% task success improvement and 49% memory reduction over full-context history. The pattern is consistent: agents that track how sure they are outperform agents that treat all knowledge equally.

## How It Works

### Confidence and Evidence

Every memory has a confidence score between 0 and 1, plus an evidence count tracking how many times it has been confirmed. The origin determines initial strength — a direct user statement starts at 0.9, something inferred from indirect evidence starts at 0.5. Over time, evidence accumulates regardless of origin: an inference confirmed five times becomes as trusted as a direct statement.

### Time-Based Decay

Without reinforcement, confidence fades. A memory about the user's favorite restaurant starts strong, but after months without any mention, its influence on recall drops. Decay follows the Ebbinghaus forgetting curve with evidence-weighted inertia: well-evidenced memories resist erosion. A memory confirmed four times decays at half the rate of a single observation. A memory confirmed sixteen times takes four times as long to fade.

Decay is computed at query time, never stored. No background jobs. No batch processing. The database stays clean; math does the rest.

### Self-Healing

The system converges toward correct state even without perfect maintenance. Contradictory memories coexist harmlessly — "User loves pizza" from three months ago and "User prefers sushi" from yesterday both exist, but the sushi memory scores dramatically higher because it's fresher and more confident. No explicit cleanup needed for the system to behave correctly. Explicit maintenance (forgetting outdated memories, merging duplicates) makes convergence faster, but the ranking formula is the safety net.

## What Memory Does Not Store

Memory stores beliefs about the world — facts, observations, technical knowledge, preferences as discrete data points. It does not store relational understanding.

"User prefers tabs over spaces" is a memory — a discrete observation with confidence and decay. "The user is someone who cares deeply about consistency and encodes their values into tooling choices" is relational understanding — an integrated model of who someone is, built from many observations over time. That belongs in the pack system, not in memory.

The distinction: a memory is an atom. A pack bond is a molecule made from many atoms. Individual observations about people are memories. The ghost's understanding of who those people are, how they relate, and where the ghost itself stands toward them lives in pack bonds. Both systems are independent. They reinforce each other — a fading memory about someone can be refreshed when the ghost revisits the bond — but they store fundamentally different things. Memory stores what the ghost noticed. Pack stores who the ghost knows.

## Recall

Recall is how the agent accesses what it knows. It happens automatically before every response — the user's message is searched against the memory store and relevant results are injected into context. Zero cognitive load on the agent, zero extra LLM calls.

### Two-Phase Search

The primary search ranks memories by confidence and freshness, then scores the top candidates by meaning similarity. This biases toward recent, confident memories — usually the right call. But a highly relevant memory from months ago with low evidence can get buried under fresher noise.

When the primary search underperforms, a full-text fallback fires automatically. SQLite's FTS5 engine finds memories by exact word matching regardless of age or confidence. The two methods are complementary: the primary search captures character-level similarity ("TypeScript preference" matches "TS preferences" through shared trigrams), while full-text captures term relevance ("food preferences" matches "favorite food is sushi" because the word "food" appears literally). Both run entirely in code — zero LLM calls, zero extra tokens.

### Confidence Labels

Results carry confidence labels that guide the agent's language naturally. Strong memories are stated as fact. Fading ones get hedged. Faint ones are flagged as uncertain. Not because the agent was told to be cautious — because the metadata guides its judgment organically. [Hound](https://arxiv.org/abs/2510.09633) (Oct 2025) shows this pattern improves recall from 8.3% to 31.2% — a 3.8× gain from the simple act of tracking how sure you are.

## Four Operations

Four verbs cover every situation. Each works as an agent tool, a CLI command, and a web UI action.

**Remember** — Store a new belief. After storing, surfaces similar existing memories so the agent can spot duplicates or contradictions. Does not auto-deduplicate or auto-reinforce — "loves pizza" and "hates pizza" are nearly identical in every distance metric but carry opposite meanings. That judgment stays with the agent, not the math.

**Recall** — Search memories by meaning. Returns ranked results with confidence labels. Most of the time this runs automatically before every agent turn; explicit recall is for targeted searches.

**Forget** — Remove a belief that is wrong or irrelevant. A soft delete that preserves revision history while excluding the memory from future recall.

**Revise** — Update understanding. Correct a memory (supersedes the old, creates new), merge related memories into one richer entry, or confirm a memory (bumps confidence, extends its resistance to decay). The merge capability is what makes this more than CRUD — two partial truths combine into one complete picture, with the supersession chain preserving history.

## Performance

The ranking formula splits work between SQLite and JavaScript. SQLite computes confidence × freshness using its native C math library — no JavaScript crossing. The database pre-ranks all active memories and returns only the top candidates. JavaScript then computes meaning similarity on that small set.

At 10,000 memories this completes in under 10ms. At 50,000 it stays under 20ms. Embeddings use local character trigram hashing — deterministic, no API calls, 1KB per memory. For a personal agent's memory corpus, this is sufficient and costs zero latency.

## Configuration

Eight knobs control memory behavior at runtime. All are tunable through the agent's config tools, the CLI, or the web UI — no restart required. See [Config](features/CONFIG.md) for the full configuration system. The agent can adjust these during reflection to tune its own effectiveness based on observed behavior.

| Key | Default | What it does |
|-----|---------|-------------|
| `memory_half_life_days` | **90** | Days until an unconfirmed memory's influence halves. *The single most impactful knob.* Lower means aggressive forgetting; higher means long memory. |
| `memory_recall_k` | **10** | Number of results returned per recall. More results mean richer context but more tokens consumed. |
| `memory_min_score` | **0.01** | Floor for relevance. Memories scoring below this are dropped. Raise to cut noise from context. |
| `memory_candidate_pool_multiplier` | **20** | Pre-ranking pool depth (k × multiplier candidates). Higher means more thorough search at the cost of speed. |
| `memory_fallback_threshold` | **0.15** | Best-score threshold below which the full-text fallback fires. Lower means FTS rarely triggers; higher means it triggers more often. |
| `memory_fallback_min_results` | **3** | Minimum primary results before skipping the FTS fallback. Raise to use fallback more aggressively. |
| `memory_ema_alpha` | **0.3** | Confirmation boost rate. Each confirmation applies exponential moving average. Higher means faster confidence ramp; lower means more gradual. |
| `memory_max_confidence` | **0.99** | Confidence ceiling. Prevents any memory from reaching absolute certainty. Lower for a more skeptical agent. |

**Quick tuning guide:**

- *Short-lived project agent* — lower half-life to 30, raise min_score to 0.05.
- *Long-term personal companion* — raise half-life to 365.
- *Too many tokens in context* — lower recall_k to 5.
- *Missing relevant old memories* — raise candidate_pool_multiplier to 30, or lower fallback_threshold so FTS fires more often.
- *Everything becomes "strong" too quickly* — lower ema_alpha to 0.15.

## References

- [Belief Decay](https://doi.org/10.5281/zenodo.18203372) — Intrinsic decay, evidence-weighted reinforcement, and evidence integration as the three forces against epistemic rigidity.
- [Hindsight](https://arxiv.org/abs/2512.12818) — Structured memory networks lift accuracy from 39% to 83.6% on long-horizon benchmarks.
- [ABBEL](https://arxiv.org/abs/2512.20111) — Concise belief states with confidence tracking: 20% task improvement, 49% memory reduction.
- [Hound](https://arxiv.org/abs/2510.09633) — Persistent hypotheses with confidence tracking: 3.8× recall improvement.
- [DRN](https://arxiv.org/abs/2508.04339) — Calibrated belief tracking improves 23.6% on TruthfulQA.
- [Belief-Augmented Memory Enzymes](https://clawxiv.org/api/pdf/clawxiv.2602.00032) — Production deployment with 205 beliefs and 3,217 knowledge graph connections.
- [Memento-II](https://arxiv.org/abs/2512.22716) — Convergence guarantees: well-designed ranking converges toward accuracy rather than accumulating noise.
- [BREW](https://arxiv.org/abs/2511.20297) — Structured environmental knowledge improves precision 10-20% and reduces API calls 10-15%.
