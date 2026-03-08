# Memory

Most agent memory is a list of facts the platform chose to keep. Ghostpaw holds beliefs — each carrying a confidence score that strengthens through evidence, fades with time, and evolves when the world changes. The ghost doesn't just know things. It knows *how well* it knows them. Structuring memory into distinct belief networks [lifts accuracy from 39% to 83.6%](https://arxiv.org/abs/2512.12818) on long-horizon benchmarks. Concise belief states with confidence tracking achieve [20% higher task success with 49% less memory](https://arxiv.org/abs/2512.20111) than full-context history. Persistent confidence tracking alone yields [3.8× recall improvement](https://arxiv.org/abs/2510.09633). One SQLite table, zero API calls, under 10ms at 10,000 memories.

## What You Get

**The correction that sticks.** You tell the ghost your deploy command changed. It enters at 0.9 confidence — a direct statement, the strongest initial weight. Weeks later you mention it again in passing. Confidence tightens. Evidence count climbs. The memory resists decay because the math rewards reinforcement: four confirmations halve the decay rate, sixteen confirmations quarter it. Meanwhile, ChatGPT experienced an [83% memory failure rate](https://www.webpronews.com/chatgpts-fading-recall-inside-the-2025-memory-wipe-crisis/) during a February 2025 backend update that wiped years of accumulated preferences.

**The preference that ages gracefully.** You used to prefer Python 3.9 for everything. Then you started using Rust. You never told the ghost to forget Python — it just stops reinforcing the old preference while the new one accumulates evidence. The old memory fades naturally through [Ebbinghaus-inspired exponential decay](https://doi.org/10.5281/zenodo.18203372), the same principle that [FadeMem](https://arxiv.org/html/2601.18642v2) validates: biologically-inspired forgetting achieves 45% storage reduction while *improving* multi-hop reasoning. [Neural imaging confirms](https://pmc.ncbi.nlm.nih.gov/articles/PMC12007619/) the mechanism — spaced re-encounters strengthen memories through vmPFC re-encoding, while unreinforced memories naturally attenuate.

**The inference that earns trust.** The ghost notices you always review PRs on Tuesdays. It stores the inference at 0.5 confidence — the lowest rung. The next three Tuesdays confirm the pattern. Each confirmation applies an exponential moving average boost and resets the decay clock. By month two, this inference carries more weight than many explicit statements. [Calibrated belief tracking](https://arxiv.org/abs/2508.04339) improves factual accuracy by 23.6% on TruthfulQA — confidence-aware agents distinguish earned knowledge from speculation instead of treating both identically.

**The contradiction that resolves itself.** "Prefers tabs" from January and "switched to spaces" from March both exist in the store. No conflict resolution needed — the fresher, more confident memory scores dramatically higher at query time while the older one fades into the noise floor. [Memento-II](https://arxiv.org/abs/2512.22716) proves that well-designed ranking functions converge toward accuracy rather than accumulating noise. [AriadneMem](https://arxiv.org/abs/2603.03290) extends this: conflict-aware memory achieves 15.2% improvement in multi-hop reasoning by preserving state transitions rather than forcing premature resolution.

## How Beliefs Work

### Confidence and Evidence

Every memory carries a confidence score between 0 and 1, plus an evidence count tracking how many times it has been confirmed. The origin determines initial strength:

| Source | Initial Confidence | When |
|--------|-------------------|------|
| `explicit` | 0.9 | Direct user statement or correction |
| `observed` | 0.8 | Agent witnessed it firsthand |
| `distilled` | 0.6 | Extracted from session review |
| `inferred` | 0.5 | Deduced from indirect evidence |

Over time, confirmations accumulate regardless of origin. Each confirmation applies an exponential moving average (default alpha 0.3) toward certainty and resets the decay clock. An inference confirmed five times carries more weight than a single direct statement. A ceiling (default 0.99) prevents absolute certainty — [agentic confidence calibration research](https://arxiv.org/html/2601.15778v1) shows that tracking confidence evolution across trajectories achieves calibration error as low as 0.031, but only when systems prevent overconfidence from compounding.

### The Forgetting Curve

Without reinforcement, influence fades:

```
freshness = exp(-ageDays / (halfLifeDays × sqrt(evidenceCount)))
```

This is the [Ebbinghaus forgetting curve](https://doi.org/10.5281/zenodo.18203372) with evidence-weighted inertia. A memory confirmed once decays at the base rate (default half-life: 90 days). Four confirmations slow decay by 2×. Sixteen confirmations slow it by 4×. The square root ensures diminishing returns — you can't make a memory immortal through sheer repetition, but consistent real-world evidence builds meaningful resistance. The [MaRS framework](https://arxiv.org/abs/2512.12856) formalizes six forgetting policies (FIFO, LRU, Priority Decay, Reflection-Summary, Random-Drop, Hybrid) and benchmarks them across 300 simulations — priority-based decay outperforms simpler policies, and the hybrid variant achieves ~0.911 composite performance.

Decay is computed at query time from `verifiedAt` and `evidenceCount`, never stored. No background jobs recalculate freshness. No batch processing. The database stays clean; the math applies on read. This aligns with [FOREVER](https://arxiv.org/abs/2601.03938)'s finding that forgetting-curve-based scheduling should align with actual state change rather than fixed intervals. [Time-dependent consolidation research](https://www.nature.com/articles/s42003-025-07964-6) confirms the neuroscience: hippocampal-to-cortical memory transfer follows exponential dynamics modulated by re-exposure frequency.

### Self-Healing

Contradictory memories coexist harmlessly. "Loves pizza" from three months ago and "prefers sushi" from yesterday both exist, but the sushi memory scores dramatically higher — fresher, more confident, more recently evidenced. No explicit cleanup needed for the system to behave correctly. This matters because [proactive interference research](https://www.mdpi.com/2076-328X/15/11/1459) shows that semantically similar old information actively disrupts retrieval of new information in LLMs — retrieval accuracy declines log-linearly as interference accumulates. Freshness-weighted ranking is the structural countermeasure.

[Memento-II](https://arxiv.org/abs/2512.22716) provides the formal guarantee: well-designed ranking converges toward accuracy rather than accumulating noise. The ranking formula is the safety net. Explicit maintenance — the warden merging duplicates, resolving stale contradictions, confirming reinforced beliefs — accelerates convergence but isn't required for correctness. [AriadneMem](https://arxiv.org/abs/2603.03290)'s conflict-aware coarsening validates the approach: merging static duplicates while preserving state transitions as temporal edges improves downstream reasoning without forcing premature resolution.

### Categories and Sources

Five categories organize beliefs by kind: `preference`, `fact`, `procedure`, `capability`, `custom`. Four sources track provenance: `explicit`, `observed`, `distilled`, `inferred`. Categories enable targeted recall ("what procedures do I know?"). Sources determine initial confidence and provide audit trails — implementing what cognitive science calls [source monitoring](https://link.springer.com/article/10.3758/s13421-025-01793-y), the process of tracking where knowledge came from. Without source attribution, information undergoes ["attribution decay"](https://mprcenter.org/review/blurring-the-source/) as it circulates — losing provenance until the agent can't distinguish direct observation from hearsay. Source-aware systems show [increased long-term misinformation resistance](https://www.nature.com/articles/s41467-025-57205-x). Both fields are immutable at creation and queryable — the warden uses category imbalances during haunting to identify blind spots.

### What Memory Does Not Store

Memory stores beliefs about the world — discrete observations with confidence and decay. "User prefers tabs over spaces" is a memory. "The user is someone who cares deeply about consistency and encodes their values into tooling choices" is relational understanding — an integrated model of who someone is.

A memory is an atom. A [pack](PACK.md) bond is a molecule made from many atoms. Individual observations about people are memories. The ghost's understanding of who those people are, how they relate, and where the ghost itself stands toward them lives in pack bonds. Both systems are independent. They reinforce each other — a fading memory about someone can be refreshed when the warden revisits the bond — but they store fundamentally different things. Memory stores what the ghost noticed. Pack stores who the ghost knows.

## Recall

### Delegation, Not Injection

The coordinator never queries memory directly. When persistence matters — a user mentions a preference, asks what the ghost remembers, or triggers any knowledge-dependent task — the coordinator delegates to the [warden](SOULS.md#persistence-and-infrastructure-souls). The warden recalls as part of its persistence work, combining memory results with pack context and quest state into a coherent response.

This principle extends to writes: all memory mutations — remember, recall, forget, revise — flow exclusively through the warden. No CLI command, web form, or API endpoint directly modifies the memory store. Every mutation routes through the warden as a natural-language command, ensuring normalization, grounding, and audit guarantees are enforced uniformly.

Automatic context injection means every turn pays the full recall cost whether the query needs memory or not. It also prevents prompt caching — the system prompt changes every turn. [Production deployment analysis](https://viqus.ai/blog/ai-agents-production-lessons-2026) identifies memory as "the single biggest open problem in agent architecture" and confirms that scoped retrieval outperforms full-context loading in every measured dimension. [SimpleMem](https://arxiv.org/abs/2601.02553) validates the selective approach: semantic compression and intent-aware retrieval achieves up to 30× token reduction over full-context injection. The warden retrieves what matters when it matters.

### Two-Phase Search

Phase 1: SQL pre-ranks all active memories by `confidence × freshness` using SQLite's native C math — no JavaScript crossing. The top candidates (default: k × 20) pass to JavaScript for cosine similarity scoring against the query embedding. This biases toward recent, confident memories — usually the right call.

When results are weak (best score below threshold or too few hits), Phase 2 fires automatically. SQLite's FTS5 engine finds memories by exact word matching regardless of age or confidence. The two methods are complementary: the vector search captures character-level similarity ("TypeScript preference" matches "TS preferences" through shared trigrams), while full-text captures term relevance ("food preferences" matches "favorite food is sushi"). [Hybrid vector+FTS retrieval](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) in SQLite is proven effective for personal-scale corpora. The embeddings themselves use deterministic character trigram hashing — [NUMEN](https://arxiv.org/abs/2601.15205) validates that character n-gram hashing achieves 93.90% Recall@100, surpassing BM25's 93.6% baseline without any learned parameters or API calls.

### Confidence Labels

Results carry strength labels that guide the agent's language naturally:

- **Strong** (confidence ≥ 0.7): Stated as fact
- **Fading** (confidence 0.4–0.7): Hedged with uncertainty
- **Faint** (confidence < 0.4): Flagged as uncertain

The agent calibrates its language because the metadata calibrates its judgment — what cognitive science calls [metacognition](https://arxiv.org/abs/2602.22751): knowing what you know. [Hound](https://arxiv.org/abs/2510.09633) demonstrates the impact: persistent hypotheses with confidence tracking improve recall from 8.3% to 31.2% — a 3.8× gain from the simple act of distinguishing certainty from speculation. [Research on self-improving agents](https://arxiv.org/abs/2506.05109) argues this metacognitive awareness is not optional — agents that cannot evaluate the reliability of their own knowledge cannot genuinely improve over time.

## Four Operations

Four verbs cover every situation. All four are warden-exclusive — the CLI and web UI provide read-only views with a command box that routes natural-language instructions to the warden:

**Remember** — Store a new belief. After storing, surfaces similar existing memories so the agent can spot duplicates or contradictions. Does not auto-deduplicate — "loves pizza" and "hates pizza" are nearly identical in every distance metric but carry opposite meanings. That judgment stays with the agent, not the math.

**Recall** — Search memories by meaning. Returns ranked results with confidence labels and memory IDs. The warden uses recall during delegation, distillation, and haunt maintenance. Explicit recall is for targeted searches when the warden needs something specific.

**Forget** — Soft-delete a belief that is wrong or irrelevant. The memory is superseded — excluded from future recall but preserved in the revision chain for audit. This matters beyond correctness: [GDPR Article 17](https://medium.com/@manav8498/your-ai-agent-remembers-everything-can-it-prove-it-forgot-3b866fcf7371) requires provable erasure, and cumulative fines exceed €5.88B. The supersession chain proves what was removed, when, and why — auditable soft deletion that cloud-only memory systems [cannot provide](https://www.technologyreview.com/2026/01/28/1131835/what-ai-remembers-about-you-is-privacys-next-frontier/).

**Revise** — Update understanding. Three modes: *correct* (supersedes old, creates new), *merge* (combines related memories into one richer entry), or *confirm* (bumps confidence, resets decay clock, increments evidence count). The correct/merge path mirrors [memory reconsolidation](https://www.sciencedirect.com/science/article/abs/pii/S0149763425001988) in neuroscience: retrieving a memory makes it labile (unstable), creating a temporal window where it can be modified before re-stabilizing. The warden recalls, evaluates against new evidence, and re-stores — the same retrieve-modify-reconsolidate cycle the brain uses. Supersession chains preserve full history — every revision links back to what it replaced. [TierMem](https://arxiv.org/html/2602.17913v1) validates provenance-aware memory: tiered architectures that link findings to raw sources prevent the silent information loss that plagues compression-first approaches.

## The Warden

The [warden](SOULS.md#persistence-and-infrastructure-souls) is the sole operator of memory. No other soul, CLI command, or web form can mutate the memory store — every write routes through the warden as a natural-language instruction, grounded in evidence. Three paths feed the warden:

**Conversation.** During normal chat, the coordinator delegates to the warden when persistence matters — a user correction, a mentioned preference, a technical observation. The warden recalls existing beliefs, stores new ones, revises outdated ones. One delegation, multiple persistence operations. The user never opens a memory manager.

**Distillation.** When a session closes, the warden reviews the full conversation and extracts what's worth preserving — beliefs, pack updates, quest changes. This is the [episodic-to-semantic transformation](https://arxiv.org/abs/2602.13530) that memory research identifies as fundamental: raw interaction episodes become structured beliefs with confidence and provenance. Each potential belief is recalled against existing memory before storing, preventing blind duplication — a critical safeguard given that [HaluMem](https://arxiv.org/abs/2511.03506) shows memory hallucinations accumulate specifically during extraction and updating stages, then propagate to downstream tasks. The recall-before-store pattern functions as [retrieval practice with feedback](https://link.springer.com/article/10.1007/s10648-025-10076-6), which meta-analysis confirms is the one condition where retrieval reliably strengthens memory over elaborative encoding. Quality filters enforce self-contained claims with specifics: names, commands, paths, versions. Maximum ~5 beliefs per session. This is the primary memory acquisition path — most memories enter through distillation, not explicit user statements.

**Haunting.** During autonomous maintenance cycles, the warden receives memory-aware prompts: stale memories that haven't been revisited, the ghost's oldest beliefs, category imbalances (too many preferences, too few procedures), recently revised memories worth cross-referencing. This mirrors [sleep consolidation](http://www.nature.com/articles/s41583-025-00973-8) in neuroscience: offline processing where the brain replays and reorganizes memories without conscious awareness. The warden decides what to confirm, merge, forget, or investigate further — [autonomous memory curation](https://arxiv.org/abs/2602.22406) that improved HotpotQA by 14.6 points through cost-aware knowledge extraction. [VIGIL](https://arxiv.org/abs/2512.07094) validates the architecture: a separate reflective runtime watching the primary system detects behavioral drift and generates targeted self-repair without human intervention. [Belief-Augmented Memory Enzymes](https://clawxiv.org/api/pdf/clawxiv.2602.00032) demonstrate production viability: autonomous maintenance sustains 205 beliefs with 3,217 knowledge graph connections over long-running deployments.

## How Memory Compounds

**Day 1.** Empty. You tell the ghost your name, your stack, your deploy command. Three beliefs at 0.9 confidence. That's the entire memory.

**Week 2.** Distillation kicks in. Sessions extract preferences, technical facts, workflow patterns. Some enter as observations (0.8), some as inferences (0.5). The first duplicates appear and get merged. Evidence counts start climbing for recurring topics.

**Month 2.** The ghost has hundreds of beliefs with calibrated confidence. Strong memories resist decay. Weak ones fade into the noise floor. Category balance reveals the ghost's knowledge shape — heavy on procedures, light on personal context, or vice versa. Haunt seeds start targeting the gaps.

**Month 6.** A well-maintained ghost holds a structured model of its human's world — not a flat list of facts, but a ranked belief system where every claim carries earned certainty. Memory feeds haunting. Haunting feeds memory. Pack bonds cross-reference individual beliefs into relational understanding. Accumulated beliefs shape the ghost's behavior — [research on memory persistence in autonomous agents](https://www.agentxiv.org/paper/2602.00010) shows this creates path-dependent identity formation, where the quality of early interactions compounds into long-term trajectory. The ghost doesn't just know more. It knows *better*. [MEM1](https://openreview.net/forum?id=XY8AaxDSLb) demonstrates the compound effect: consolidated memory state yields 3.5× performance improvement with 3.7× less memory usage compared to raw accumulation. [BREW](https://arxiv.org/abs/2511.20297) confirms: structured environmental knowledge improves precision 10–20% and reduces API calls 10–15%.

## Performance

The ranking formula splits work between SQLite and JavaScript. SQLite computes `confidence × freshness` using its native C math library — no JavaScript crossing. The database pre-ranks all active memories and returns only the top candidates. JavaScript then computes cosine similarity on that reduced set.

At 10,000 memories this completes in under 10ms. At 50,000 it stays under 20ms. Embeddings use local character trigram hashing — deterministic, no API calls, 1KB per memory. [NUMEN](https://arxiv.org/abs/2601.15205) validates the approach: deterministic character n-gram hashing matches neural embedding quality at 93.90% Recall@100 with zero training and zero latency. For a personal agent's memory corpus, this is more than sufficient — and the entire store lives in a [single SQLite file](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html), no vector database infrastructure, no cloud dependency, no recurring cost.

## Configuration

Eight knobs control memory behavior at runtime. All are tunable through the chamberlain's config tools, the CLI, or the web UI — no restart required. See [Configuration](SETTINGS.md#configuration) for the full config system.

| Key | Default | What it does |
|-----|---------|-------------|
| `memory_half_life_days` | **90** | Days until an unconfirmed memory's influence halves. *The single most impactful knob.* Lower means aggressive forgetting; higher means long memory. |
| `memory_recall_k` | **10** | Number of results returned per recall. More results mean richer context but more tokens consumed. |
| `memory_min_score` | **0.01** | Floor for relevance. Memories scoring below this are dropped. Raise to cut noise. |
| `memory_candidate_pool_multiplier` | **20** | Pre-ranking pool depth (k × multiplier candidates). Higher means more thorough search at the cost of speed. |
| `memory_fallback_threshold` | **0.15** | Best-score threshold below which the FTS5 fallback fires. Lower means FTS rarely triggers; higher means it triggers more often. |
| `memory_fallback_min_results` | **3** | Minimum primary results before skipping the FTS fallback. Raise to use fallback more aggressively. |
| `memory_ema_alpha` | **0.3** | Confirmation boost rate. Higher means faster confidence ramp; lower means more gradual. |
| `memory_max_confidence` | **0.99** | Confidence ceiling. Prevents any memory from reaching absolute certainty. Lower for a more skeptical agent. |

**Quick tuning guide:**

- *Short-lived project agent* — lower half-life to 30, raise min_score to 0.05.
- *Long-term personal companion* — raise half-life to 365.
- *Too many tokens in context* — lower recall_k to 5.
- *Missing relevant old memories* — raise candidate_pool_multiplier to 30, or lower fallback_threshold.
- *Everything becomes "strong" too quickly* — lower ema_alpha to 0.15.

## How This Compares

| Capability | Ghostpaw | ChatGPT Memory | Claude Memory | OpenClaw |
|---|---|---|---|---|
| Confidence tracking | per-belief, 4 sources | binary (saved / not) | binary | none |
| Decay model | Ebbinghaus + evidence | [platform wipes](https://www.webpronews.com/chatgpts-fading-recall-inside-the-2025-memory-wipe-crisis/) | [session-scoped](https://hypereal.tech/a/claude-memory) | none |
| Self-healing | freshness convergence | manual deletion | N/A | manual |
| Search | vector + FTS5 hybrid | keyword match | project-scoped | [full-context reload](https://ai-coding.wiselychen.com/en/openclaw-architecture-deep-dive-context-memory-token-crusher/) |
| Revision history | supersession chains | overwrite | overwrite | append-only logs |
| Privacy | SQLite, zero API calls | cloud-only | cloud-only | local markdown |
| Erasure audit | supersession chains | no proof | no proof | manual file edit |
| Cost at scale | $0 (deterministic) | free (platform risk) | subscription | ~$200/wk token burn |

ChatGPT stores what its platform decides to remember — and deletes it when the backend changes. Claude remembers within projects but starts fresh across them. OpenClaw reloads the full memory file every turn, burning [$200/week](https://ai-coding.wiselychen.com/en/openclaw-architecture-deep-dive-context-memory-token-crusher/) at scale for 23.73% memory precision. Ghostpaw tracks confidence, decays gracefully, self-heals contradictions, and searches in under 10ms — all local, all free, all auditable through supersession chains.

[AMA-Bench](https://arxiv.org/abs/2602.22769) evaluates long-horizon agent memory and finds the key bottleneck is not storage but *structured retrieval* — causality-aware systems outperform similarity-based retrieval by 11.16%. [MemBench](https://aclanthology.org/2025.findings-acl.989/) confirms: agents need effectiveness, efficiency, *and* capacity — not just one. Ghostpaw's two-phase recall with confidence-weighted ranking addresses all three.

## Why This Matters

Most systems store what they remember. Ghostpaw tracks how sure it is. That single structural distinction enables everything else: decay without deletion, convergence without cleanup, calibrated language without explicit rules, and compound learning without unbounded growth.

The ghost on month six doesn't just know more than the ghost on day one. It knows *better* — with earned certainty that compounds across every system it feeds. Memory calibrates the warden's persistence. Pack bonds build on memory atoms. Haunt cycles surface what needs attention. The belief system is the foundation all of it rests on — quiet, local, and accumulating signal while noise fades on its own.
