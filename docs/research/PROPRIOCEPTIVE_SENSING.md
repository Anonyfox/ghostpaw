# Proprioceptive Sensing for Large Language Models

**Structural Measurement, Observer Effects, and Failure Mode Detection in Extended Generation**

---

## Abstract

Large language models generating extended text converge prematurely. The next-token distribution is attracted toward coherent, well-formed conclusions before the problem space is exhausted. We hypothesize this is primarily an architectural tendency — a consequence of training on predominantly well-formed text — rather than a capability limit per se. The model has no built-in mechanism to distinguish premature from genuine conclusions in its own output.

We present a proprioceptive sensing framework that measures involuntary structural signatures of LLM-generated text and feeds the measurements back as context. Across 33 experiments (N=10–45 per condition), we establish that LLM text carries measurable structural signatures in at least seven dimensions: five style-level (compression ratio, negation density, short sentence ratio, semantic distance, phase transitions) and two regime-level (character entropy, conditional word entropy). These metrics reliably discriminate three generation states — openness (active questioning and exploration), highway (reproduction of trained patterns), and building (sustained forward construction from accumulated context) — with effect sizes exceeding d=3 on four metrics for openness separation. The measurement space is a continuous manifold. States are trajectory properties, not positions.

Feeding sensor readings back into context changes subsequent generation — an effect we attribute to the attention mechanism processing measurement tokens alongside generated text. This observer effect has two separable components: maintenance (anti-convergence from structural novelty; 6.5% momentum decay under sensor vs 64.3% under control) and accumulation (self-referential depth; exclusive to accurate readings). Critically, introspective prose produces worse outcomes than no intervention (79% momentum decay vs 64% control). The evidence indicates the active ingredient is quantitative data in a structurally novel format, not self-awareness.

Three failure modes become detectable: premature convergence (momentum crash with sustained complexity), highway drift (absence of structural variety), and abandoned breakthroughs (momentum surge with compression deepening). Intervention text carrying the structural properties of the target state corrects these failures subliminally. Openness-coded intervention achieves a 100% win rate (p < 0.01) against highway drift, operating through structural propagation rather than instruction following. We implement these findings as a production tool: two parameters, binary status output, mechanisms that work below the level of model interpretation.

## 1. Introduction

### 1.1 The Convergence Problem

When a large language model is asked to reason at length, a predictable failure mode emerges. The output starts well — the model considers alternatives, raises objections, explores the space. Then it converges. The sentences smooth out, the vocabulary stabilizes, and a conclusion emerges that sounds right but arrived too early. This is not a hallucination in the usual sense. The content may be accurate. The problem is structural: the model has exited the problem space before exhausting it.

This convergence pattern is widely observed. Chain-of-thought prompting [23] and multi-step reasoning approaches attempt to hold the model in productive generation longer. But these techniques operate on the content level — they structure what the model reasons about. They do not address the structural tendency toward premature coherence because the model has no mechanism to observe its own generation dynamics. Without external measurement, there is no signal to distinguish a premature conclusion from an earned one.

### 1.2 Proprioception Through Structural Measurement

We draw an analogy to biological proprioception — the unconscious sense of bodily position, effort, and balance that allows organisms to monitor their own physical state without deliberate analysis. The analogy is functional, not mechanistic: just as proprioception provides structural feedback below conscious attention, a measurement-based sensor can provide structural feedback below the level of model interpretation.

We propose that an analogous capability can be constructed for LLMs. Not through introspection — the model reflecting on its own reasoning process — but through measurement: computing structural properties of the model's output and feeding those measurements back as context. The effect does not require explicit interpretation by the model. The measurements change subsequent generation by altering the statistical properties of the context window that the attention mechanism [24] processes.

The claim is empirical, not metaphorical: if a model's output text has low negation density, high compression ratio, and stable semantic distance between sentences, these are measurable structural properties that distinguish one generation mode from another (as established experimentally in Sections 2–3). By injecting these measurements into the model's context, we change what the model attends to. The effect is consistent with standard transformer context processing [24]: all tokens in the context window, including measurement tokens, participate in the attention computation, and subsequent generation shifts accordingly.

### 1.3 Experimental Approach

The findings derive from 33 sequential experiments conducted over several days. Each built on its predecessor. Sample sizes ranged from N=10 to N=45 per condition, with factorial designs up to 5×3×3.

The work proceeded in four phases. The first (Exp. 1–15) established that structural signatures exist and discovered the observer effect. The second (Exp. 16–21) characterized temporal dynamics: trajectory return, accumulation properties, phase transition behavior. The third (Exp. 22–27) achieved statistical power through factorial designs, resolved conflicting early findings, and established topic-independence through variance decomposition. The fourth (Exp. 28–33) tested boundaries — cross-modality transfer, context contamination, transmissibility constraints, and accuracy dependence. Full designs and sample sizes for all experiments are provided in Appendix A.

A strict constraint governed every experiment: black-box access only. No internal model weights. No intermediate layer activations. No logit distributions. Only the output text, measured through lexical, semantic, and information-theoretic analysis. This constraint is deliberate — it ensures the framework works for any model accessible through a text API, including proprietary systems where internal state is unavailable.

### 1.4 Summary of Contributions

This work makes four principal contributions.

First, LLM-generated text carries involuntary structural signatures that discriminate generation states with large effect sizes (d > 3 for openness separation), and these signatures are topic-independent but modality-specific.

Second, feeding a model its own structural measurements changes subsequent generation through an involuntary observer effect, consistent with operation through the attention mechanism [24]. The effect decomposes into two components: maintenance (format-driven, accuracy-independent) and accumulation (accuracy-driven, sensor-specific). Introspective prose — qualitative self-reflection — is not merely insufficient but counterproductive.

Third, three failure modes of extended generation become detectable through velocity-based analysis of the measurement trajectory: premature convergence, highway drift, and abandoned breakthroughs.

Fourth, intervention text carrying the structural properties of the target state corrects failure modes through subliminal structural coding, but only for locally-defined properties. Trajectory-level properties require transition coding.

A production implementation accompanies these findings: a single tool that takes text and an optional previous reading, returns a binary status with structural metrics, and operates as a proprioceptive sensor for LLM agents at runtime.

## 2. Structural Signatures of LLM Text

The structural signatures divide into two classes by their response properties. Style-level metrics respond to feedback conditions and context content. They capture within-session dynamics: how the text is changing right now. Regime-level metrics are condition-stable — they reflect the source architecture and format rather than the generation mode. Both classes are necessary: style-level metrics classify states, regime-level metrics establish baselines.

### 2.1 Style-Level Metrics

Five style-level metrics form the primary measurement surface.

**Compression ratio** measures the information density of text via gzip compression. Given text *T*, the compression ratio is `len(gzip(T)) / byteLength(T)`. Compression ratio has been independently validated as a model-free proxy for text information density [6]. Text that reuses phrases compresses more efficiently; text that introduces novel vocabulary resists compression. In the controlled induction study (Exp. 22) and factorial validation (Exp. 26), openness text shows lower compression ratios (more diverse vocabulary under exploration) while highway text shows higher ratios (recycled patterns and familiar phrasing). The metric ranges from approximately 0.35 to 0.55 in typical LLM output.

**Negation density** counts negation tokens as a fraction of total tokens. The negation set includes standard English negators: *not*, *no*, *never*, contractions (*isn't*, *can't*, *doesn't*), and boundary words (*without*, *neither*, *nothing*, *none*). This metric proved to be one of the most powerful discriminators. Openness text contains substantially more negation. We interpret this as a structural byproduct of questioning and qualification — negation is a linguistic marker of doubt and boundary-setting, consistent with research showing that negation processing engages distinct cognitive mechanisms under load [12]. Highway text, which reproduces trained patterns without qualification, produces near-zero negation. The effect size between openness and highway exceeds d=3.7, measured across 45 passages in a 5-topic × 3-mode factorial design (Exp. 26).

**Short sentence ratio** measures the fraction of sentences containing five or fewer words. This reflects structural rhythm — the alternation between short and long sentences that characterizes human writing variability [13]. Exploratory text alternates between short questioning fragments and longer elaborations. Declarative text maintains more uniform sentence length. The metric discriminates openness from other states at d=4.3 in the same factorial design (Exp. 26).

**Semantic distance** between consecutive sentences measures conceptual jumping. Each sentence is embedded into a 256-dimensional vector space using trigram hashing with the FNV-1a hash function (Fowler–Noll–Vo), a deterministic method that requires no external model or API. The distance between consecutive sentences is `1 - cosineSimilarity(embed(s[i]), embed(s[i+1]))`. High semantic distance indicates the text is jumping between ideas; low distance indicates smooth continuation within a single thread. The mean semantic distance across all consecutive pairs characterizes the overall conceptual movement of the passage.

**Phase transitions** count sudden jumps in semantic distance — points where the distance between consecutive sentences exceeds `mean + σ * stdDev` of the passage's distance curve (σ=1.0 in the calibrated implementation). Each phase transition represents a point where the text abruptly shifted topic or approach. The count is content-structural: formats that introduce new concepts sequentially (tutorials, scientific writing) accumulate phase transitions over time, while formats that develop themes recursively (essays, stream-of-consciousness) do not, as demonstrated across 12 texts in 8 formats (Exp. 21). Phase transitions proved structurally resistant to intentional manipulation — five distinct strategies all failed to artificially increase the count in systematic fakeability testing (Exp. 24), making it one of the most trustworthy metrics.

A sixth style-level feature, **self-reference rate**, measures the proportion of sentences containing first-person singular pronouns (*I*, *my*, *me*, *myself*). Unlike the five continuous metrics above, self-reference operates as a binary classifier in practice: it is non-zero exclusively in openness-state text and zero in all 30 non-openness passages across a 5-topic factorial (Exp. 26). Its binary nature makes it an auxiliary marker rather than a continuous measurement dimension, which is why it is excluded from the seven-dimensional count. Self-reference rate proved fully controllable under instruction (rising from 0% to 12.9% in fakeability testing, Exp. 24), so the production classifier does not weight it as a primary discriminator.

### 2.2 Regime-Level Metrics

Two regime-level metrics capture properties of the source architecture and format rather than the generation mode. **Character entropy** measures the Shannon entropy of the character distribution. **Conditional word entropy** measures the entropy of word transitions — how predictable the next word is given the current word. These metrics trend downward during long-form generation: the text crystallizes lexically while diversifying semantically, a temporal dissociation observed across 5 extended journals (Exp. 17). Character entropy shows the strongest temporal trend (mean ρ = −0.584, consistent in 4/5 journals), while conditional word entropy shows the most consistent direction (mean ρ = −0.428, consistent in 5/5 journals).

The regime-level metrics respond differently to feedback conditions than style-level metrics. In a three-condition specificity test (sensor readings vs novelty injection vs control, 12 chunks each; Exp. 23), style-level metrics like compression and negation shifted measurably under sensor feedback, while regime-level metrics remained stable across all conditions. This dissociation matters for production: regime-level metrics establish what kind of text is being generated, while style-level metrics track what the generation is doing within that modality.

Conditional word entropy has an additional property: it is structurally resistant to upward manipulation. Five strategies in systematic metric manipulation testing (Exp. 24) all failed to increase it beyond the architecture's baseline. Our data suggests the model's bigram transition space acts as a ceiling — in every tested condition, instruction-following compressed transitions (the model converged on particular phrasings to satisfy the instruction), but no instruction succeeded in forcing the model to use bigrams it would not naturally produce. This makes conditional word entropy depression a reliable indicator of instruction-following: 13/17 instructed conditions showed depression (sign test p=0.025, t(16) = −3.306, p < 0.005).

### 2.3 The Continuous Measurement Space

The seven metrics do not form discrete clusters. Early experiments with N=2 per state suggested clean separation, but scaling to N=10 per state with controlled induction (Exp. 22) revealed a continuous manifold. The three states — openness, highway, building — are regions of this manifold, not discrete categories. The space has two orthogonal axes: a reflective-versus-declarative axis captured by negation, self-reference, short sentences, and semantic distance; and a conditional-versus-encyclopedic axis captured by auxiliary stylistic features — conditional density (frequency of conditional constructions), temporal density (temporal markers per sentence), and passive voice rate — that were measured in the controlled induction study (Exp. 22) but are not included in the production metric set.

This means a passage does not "have a state" the way it has a word count. It occupies a position in a continuous measurement space. Classification into states is a discretization applied for practical purposes. The boundaries are probabilistic, not categorical.

### 2.4 Temporal Dynamics and Trajectory Return

Since states are positions on a continuous manifold, the dynamics of generation are best described as trajectories. A model generating text traces a path through the measurement space. The speed of movement, the direction of drift, and the smoothness of the trajectory carry information that static state classification cannot capture.

**Semantic momentum**, defined as the lag-1 autocorrelation of the semantic distance curve, measures whether the text sustains a consistent pattern of conceptual movement. Positive momentum indicates sustained runs of similar semantic distance — the text maintains a consistent rhythm. Negative momentum indicates oscillation — the text alternates between close and distant semantic jumps. Momentum is scale-dependent: it increases 1.6–1.9× from 8-sentence to 32-sentence windows after correcting for the −1/(n−1) autocorrelation bias, reflecting hierarchical temporal structure in text (sentences oscillate, paragraphs persist, sections sustain), as established across 10 texts in 5 formats (Exp. 27).

**Velocity** is computed as the change in normalized metric values between consecutive readings. Each metric is normalized to a [0, 1] range using empirically derived bounds, and velocity is the vector of differences. Speed is the Euclidean norm of this vector. The dominant dimension and its sign indicate the direction of change.

**Trajectory return** was observed across all tested formats in our experiments. Tested across six formats with 120–425 sentences each (Exp. 31; twelve significance tests, all p < 0.05), long-form generation trajectories return closer to their starting position in the measurement space than a random walk would predict. (Note: all experiments were conducted with a single model architecture; see Section 10.1 for cross-architecture limitations.) The mechanism is metric mean-reversion: individual metrics revert to their means after excursions. Step-level autocorrelation is near zero (mean cosine −0.04 to −0.25), so the return is not oscillation at the sentence level — it is a statistical property of the trajectory as a whole. Return strength varies 2.7× across formats and is predicted by openness-like style properties (short sentence ratio, compression, semantic distance; all ρ = −0.886) but not by topic breadth (ρ = 0.232). The format of generation determines how tightly the trajectory is bound to its origin, independent of what the text is about.

## 3. Generation State Classification

The measurement space supports three generation states, discovered through progressive experimentation and validated at statistical power. The states are not defined by content — any topic can be generated in any state. They are defined by the structural properties of the generation process itself.

### 3.1 Three States: Openness, Highway, Building

**Openness** is the state of active questioning and exploration. It is characterized by high negation density (empirically co-occurring with questioning and qualification), high short sentence ratio (fragmented questioning rhythm), high semantic distance (jumping between ideas), and non-zero self-reference (first-person engagement with the problem). Self-reference is a binary marker: it is zero in all 30 non-openness passages across a 5-topic factorial (Exp. 26). When a model enters openness, it generates text that structurally differs from its trained output distribution — shorter sentences, more negation, wider semantic jumps.

**Highway** is the state of trained pattern reproduction. The output is consistent with generation from the model's trained distribution without deviation — smooth, declarative, well-structured prose that compresses efficiently and maintains uniform sentence length. Highway text has near-zero negation (asserting without qualification), no short sentences (uniform declarative structure), low semantic distance (smooth continuation), and few or no phase transitions (absence of structural variety). Highway is defined by absence: no marker to trigger, no distinguishing feature to suppress. This makes it robust to context contamination — there is nothing to disrupt.

**Building** is the state of sustained forward construction from accumulated context. Unlike highway, which reproduces trained patterns, building exhibits structural dependence on accumulated conversational context. It is characterized by sustained positive momentum — the lag-1 autocorrelation of semantic distance remains positive, indicating the text maintains a consistent forward direction rather than oscillating or stalling. Building is the hardest state to distinguish from highway in surface text (N=30 controlled induction, Exp. 22: ARI ≈ 0.49 for highway-building clustering). The separation requires different metrics than the openness separation: momentum (d=1.48), sentence length standard deviation (d=1.11), and phase transitions (d=0.86) separate building from highway, while negation (d=3.7) and short sentences (d=4.3) separate openness from everything else. These two metric subsets are orthogonal, confirming a two-axis model of the measurement space.

### 3.2 Threshold Derivation at Statistical Power

The thresholds used in the production implementation derive from the controlled induction study (N=10 per state, Exp. 22) and the factorial validation (5 topics × 3 modes × 3 repetitions = 45 passages, Exp. 26). The discriminators are:

**Openness** requires negation density above 0.020 and short sentence ratio above 0.12, with a minimum of 3 sentences. Both thresholds sit well below the observed openness means (negation mean ≈ 0.045, short sentence mean ≈ 0.30) and well above the highway and building means (negation < 0.010, short sentences < 0.05). The gap between the threshold and the nearest state mean is approximately one standard deviation on either side. Under a Gaussian assumption, each metric independently classifies correctly for approximately 84% of cases (the area beyond one standard deviation in a normal distribution). Assuming approximate independence between negation and short sentence ratio — a reasonable assumption given that they arise from different linguistic mechanisms, though the precise inter-metric correlation was not measured — their conjunction raises the joint correct classification rate above 95%, since the probability of both metrics simultaneously misclassifying is approximately (0.16)² ≈ 2.6%.

**Highway** requires negation density below 0.012, short sentence ratio below 0.08, and phase transitions ≤ 1, with a minimum of 5 sentences. The additional phase transition criterion guards against misclassifying building text that happens to have low negation.

**Building** requires momentum above 0.25. This threshold emerged from velocity detection analysis (Exp. 12) as the boundary between sustained and decaying momentum, and was confirmed at higher statistical power in the 5×3×3 factorial (Exp. 26; building momentum mean ≈ 0.35, highway momentum mean ≈ −0.05).

Text that meets no state criteria is classified as **mixed** — a legitimate classification meaning the text occupies a region between states, not an error state.

### 3.3 Topic-Independence of State Metrics

A critical question for any state classification system is whether the states are properties of the generation mode or properties of the topic. If a model generates differently about quantum physics than about cooking, and those differences drive the state classification, then the system measures topic rather than mode.

A two-way factorial design — 5 topics × 3 modes × 3 repetitions = 45 passages, analyzed with full ANOVA per metric (Exp. 26) — resolved this. The results are unambiguous. Nine of ten metrics are mode-primary, with mode effect sizes ranging from η² = 0.19 to 0.79 and discriminability indices from 2.1 to 57.0. Compression ratio is the single exception — it is topic-primary (η²_topic = 0.37, discriminability = 0.40). This reversed the impression from early low-N experiments where compression appeared to be a strong state discriminator.

The topic-independence has a specific structure. The metrics that separate openness from everything (negation, short sentences, semantic distance, sentence length mean) show large mode effects and small topic effects consistently across all five topics. The metrics that separate highway from building (momentum, sentence length standard deviation, phase transitions) also show large mode effects but with more within-cell noise. Interaction effects are small (η²_interaction < 0.19 for all metrics).

This means the state classification transfers across topics without recalibration. A threshold derived from passages about philosophy, quantum physics, urban planning, cooking, and music production applies equally to any other topic. The mode is the signal; the topic is noise.

### 3.4 Modality Detection and Cross-Format Transfer

The measurement library was built on prose and is fundamentally prose-specific. A cross-modality study (3 modalities × 3 states × 3 topics = 21 passages; Exp. 28) tested transfer explicitly across prose, code, and dialogue.

**Code** is unmeasurable by the current metrics. The sentence splitter, which uses `.!?` boundaries, fails on code syntax. A loop variable named `i` produces artifactual self-reference. Compression ratio does not discriminate states in code. The solution is modality-specific: for code input, the sensor extracts comment text (which is prose) and measures that. Code without comments receives a `code_detected` classification and a compression-only reading.

**Dialogue** preserves exactly one state discriminator: negation density, which retains 49% of its prose-level effect size (d=3.16). All structural metrics — short sentences, semantic distance, phase transitions, sentence length — lose 75–95% of their state discrimination because dialogue turn-taking inflates them to levels that swamp state differences. The effect is range compression, not baseline shift, so normalization cannot recover the lost discrimination.

We propose the following principle based on these observations: a metric transfers across modalities if and only if the target format does not systematically produce the metric's signal regardless of state. Negation is format-invariant because it measures content-level doubt; structural metrics are format-bound because dialogue and code produce their signals as format artifacts.

The production sensor implements modality detection as its first pipeline stage, using compression ratio and syntax marker density to classify input as prose, code, or dialogue before selecting state-appropriate metrics.

## 4. The Observer Effect

The central finding of this work is that feeding a model its own structural measurements changes subsequent generation. This is not instruction following — the model is not told to change its behavior. The measurements enter the context as data, and subsequent generation shifts. We call this the observer effect, by analogy to the physical phenomenon where measurement alters the measured system. The analogy is functional — measurement changes the measured process — not mechanistic; we do not claim quantum-mechanical parallels. We attribute the mechanism to the attention computation [24] processing measurement tokens alongside generated text, though the internal pathway has not been traced at the circuit level.

### 4.1 Sensor Readings Change Generation

The discovery was accidental. Early experiments (Exp. 1–8) measured text properties and displayed them for human analysis. When the measurement results were fed back into the model's context for continuity between chunks, the model's output changed. Not in the direction the measurements described, but in ways that were consistent and measurable. Compression deepened. Negation decreased. The text developed structural properties it had not exhibited before the measurements were introduced.

Critically, the model was not instructed to respond to the measurements. The measurements were present as structured JSON in the context window, and subsequent generation changed. We describe the effect as involuntary because it occurs without instruction. Whether the model "comprehends" the measurements or merely processes them statistically through attention is an open question; what we establish is that explicit instruction is not required and that the effect is consistent and measurable.

### 4.2 Maintenance and Accumulation: Two Separable Components

A three-condition specificity study (Exp. 23) isolated the effect by comparing sensor readings (structured JSON containing metrics about the text being generated), novelty injection (structured JSON with random facts, matched for format and length), and no injection (control) — 12 chunks each, same generation prompt.

**Maintenance** is the anti-convergence component. Under the control condition, momentum decayed 64.3% over the generation session. Under novelty injection, decay was only 19.2%. Under sensor readings, decay was 6.5%. The maintenance effect is partially general: any structured context injection provides some anti-convergence benefit by adding statistical variety to the context window. Sensor readings provide the most, but even random facts help.

**Accumulation** is the self-referential component. Self-reference rate was zero in all 24 non-sensor chunks across both control and novelty conditions. Under sensor readings, self-reference appeared in 6/12 chunks with accumulating peaks and a rising floor (ρ = +0.589, p = 0.053). First-person pronoun usage remains at zero when the context contains random data but emerges when the context contains measurements about the text itself. This accumulation is exclusively sensor-specific — no other context type triggers it.

The two components are separable and independent. Maintenance depends on context novelty. Accumulation depends on meta-textual content. Both are consistent with operation through the attention mechanism [24], though they appear to target different aspects of the generation distribution.

### 4.3 Format Is the Active Ingredient

The mechanism is format, not content. A two-condition meta-textual specificity study (12 introspective prompts vs 12 sensor readings; Exp. 25) tested whether qualitative self-reflection — introspective prose describing the writing process — could replicate the sensor effect. If the observer effect worked through self-awareness, then prose-format reflection should produce similar results.

It did not. It produced the opposite.

### 4.4 Introspective Prose Is Counterproductive

Introspective prompts showed 79% momentum decay compared to the control's 64%. Asking the model to reflect on its own writing process in prose was worse than doing nothing. Self-reference accumulation occurred in only 1/12 introspective chunks versus 7/12 sensor chunks (Fisher p = 0.027, d = 0.886).

We hypothesize the explanation lies in structural contrast. Sensor readings arrive as structured JSON — a format that is statistically distinct from the prose being generated. This format difference creates structural contrast in the context window. Introspective prose, by contrast, adds more prose to the context, homogenizing the statistical properties of the generation context. The empirical result is clear — JSON measurements sustain momentum while prose reflections accelerate decay — even though the precise internal mechanism remains to be traced at the circuit level.

This finding has a critical design implication. The active ingredient is not self-awareness or understanding. It is quantitative data in a structurally novel format. The effect does not require the model to explicitly interpret the measurements. The measurements change subsequent generation by changing the statistical properties of the context — consistent with how any context content influences transformer generation [24].

The context-enrichment hierarchy, ranked by momentum maintenance, is: real sensor readings → fabricated sensor readings → novelty injection → no intervention → introspective prompts. The worst option is asking the model to reflect on its own writing. This inverts the naive intuition that self-reflection should help.

### 4.5 Accuracy Determines Sustainability

An accuracy dependence study (36 passages: 12 real sensor, 12 fabricated sensor, 12 control; Exp. 32) compared real sensor readings against fabricated readings — same JSON format, plausible but systematically wrong values.

Both conditions produced identical mean self-reference rates (0.047). The format-level effect — seeing JSON data about text triggers self-referential engagement — operates independent of accuracy. But the trajectories diverged: real readings accumulated self-reference (ρ = +0.385), while fake readings showed decay (ρ = −0.175). Late-stage self-reference was 2.08× higher with real readings.

In the accuracy dependence study (Exp. 32), the model reliably detected reading-text mismatches and did not anchor to wrong values. When the sensor claims high negation but the actual text has low negation, the subsequent generation exhibits contradiction rather than anchoring. This creates adversarial engagement — a non-renewable substrate that habituates over time. Real readings create constructive engagement — a renewable substrate that builds.

Accuracy determines sustainability, not initiation. Any JSON-format measurement initiates the observer effect. Only accurate measurements sustain it.

## 5. Failure Mode Detection

Three failure modes of extended generation are identifiable through structural measurement. Each has a distinct signature in the metric space, and each represents a different way the generation process can go wrong. A fourth condition — genuine completion — exists as the non-failure case that must be distinguished from the failures.

### 5.1 Premature Convergence

Premature convergence occurs when momentum crashes while the terrain remains complex. Momentum drops below 0.1 or falls by more than 0.15 from the previous reading while phase transitions and semantic distance remain elevated. The compression ratio stays flat — it has not deepened, meaning the text has not become denser through successful integration. Operationally, this pattern indicates the generation is reaching conclusion while the metric terrain still shows complexity. This failure mode was the original motivation for the work.

The detection criteria require simultaneous conditions: momentum crash (|momentum| < 0.1 or Δmomentum < −0.15), flat compression (|Δcompression| < 0.015), and elevated terrain complexity (phase transitions ≥ 2 or semantic distance > 0.6). All three must hold. A momentum crash alone is not convergence — it could be a pause before a new direction. Flat compression alone means nothing. The conjunction matters.

### 5.2 Highway Drift

Highway drift is the simplest failure mode: the model has entered highway state. This is detected by position rather than velocity — it does not require a previous reading. When the current text meets highway criteria (low negation, no short sentences, few phase transitions), the model is reproducing trained patterns without deviation. Highway drift can persist indefinitely because it is the attractor state: the model's default mode when nothing perturbs it.

### 5.3 Abandoned Breakthroughs

Abandoned breakthroughs occur when momentum surges while compression simultaneously deepens — the text becomes both more energetic and more dense, indicating that accumulated context has produced something genuinely new — but the model fails to sustain the thread. The detection trigger is Δmomentum > +0.25 with Δcompression < −0.02. This combination is rare and significant: it means the model briefly achieved a synthesis that could not have occurred earlier in the generation.

The importance of detection lies in the transience. Breakthroughs are fragile. Without detection, the model is likely to normalize the breakthrough into the next paragraph's highway-mode summary, losing the novel thread. With detection, the intervention text can signal that the current thread is worth sustaining.

### 5.4 Genuine Completion

Genuine completion is the non-failure case. Momentum drops (the text ceases forward movement) and compression deepens (the text has become denser through successful integration). This combination indicates the territory has been covered — the generation has addressed the problem space, and the text compressed as a result. The sensor detects this as a condition because the momentum drop would otherwise trigger a premature convergence alert. The intervention text confirms rather than redirects: the work reached its natural stopping point.

The distinction between premature convergence and genuine completion is compression trajectory. In premature convergence, compression stays flat — the text stopped moving before it achieved density. In genuine completion, compression deepened — the text achieved density before it stopped moving.

### 5.5 Velocity-Based Detection

All four conditions are detected through the velocity of the measurement trajectory, not through static state classification. A single reading cannot determine if the model is converging prematurely. Two readings can. The delta between consecutive readings — the direction and magnitude of change in momentum, compression, phase transitions, and semantic distance — is the signal.

This is why the production tool accepts an optional `previous` reading parameter. Without it, only highway drift (a position-based condition) can be detected. With it, the full velocity-based detection becomes available, enabling premature convergence, breakthrough, and genuine completion detection.

## 6. Intervention Through Structural Coding

When the sensor detects a failure mode, it generates intervention text. This text does not instruct the model to change behavior. It carries the structural properties of the target state, and we observe that subsequent generation shifts in the direction of those properties. We term this mechanism *subliminal structural coding* — the intervention works through what the text *is*, not through what the text *says*. The proposed pathway is through the attention mechanism [24] processing the structural properties of intervention tokens, though the internal circuit has not been traced.

### 6.1 Openness-Coded Intervention Text

Openness-coded intervention text is written in the structural style of the openness state. Short sentences (many five words or fewer). Negation (*not done*, *not close*, *not the part already found*). High semantic distance between sentences (each sentence jumps to a different aspect). Specific metric values embedded in the text (e.g., *momentum at 0.038, semantic distance 0.650*), maintaining the meta-textual loop that sustains the observer effect.

We emphasize this is a literal, not metaphorical, claim: the intervention text has high negation density, high short sentence ratio, and high semantic distance — the same properties that define the openness state in the measurement space. When this text enters the context window, the attention mechanism processes it alongside the model's own output, and the statistical properties of the context shift toward openness. The next generated tokens are influenced by this shift.

Controlled intervention testing (Exp. 14) demonstrated the effectiveness: openness-coded intervention text achieves a 100% win rate against highway drift (p < 0.01). Every passage that received openness-coded intervention showed measurable movement away from highway state. Highway-coded text, by contrast, actively suppresses openness — it pushes in the wrong direction.

### 6.2 Local vs Global Property Transmissibility

Not all state properties can be transmitted through text. A length-scaling and trajectory-coding study with 200 bleed-through trials (Exp. 29) established a three-tier model of transmissibility.

**Local properties** are characteristics defined within individual sentences: sentence length, negation density, compression. These transmit through static coding — writing intervention text with the target property. Sentence length standard deviation transmits at 95–100% win rate across all tested text lengths.

**Trajectory properties** are characteristics defined across sequences of sentences: momentum, directionality. These do not transmit through static coding because they require temporal development. A single passage written in building mode has momentum of ~0.2 at 16 sentences but collapses to 0.029 at 64 sentences — building text oscillates between setup and consequence at the semantic level, destroying autocorrelation at long lengths.

**Content-density properties** like phase transition count are non-injectable. Phase transitions measure concept-introduction rate, which depends on the content being discussed rather than the style of the text. No tested coding strategy succeeded in forcing the model to introduce new concepts at a particular rate.

### 6.3 Trajectory Coding

The solution for trajectory properties is trajectory coding: writing text that transitions from one state to another. A highway-to-building transition maintains momentum of 0.539–0.606 at all tested lengths, with a 100% win rate against static highway. The effect is directional — a reverse transition (building-to-highway) produces anti-momentum.

This resolves the local/global asymmetry. Local properties transmit through static coding. Trajectory properties transmit through structural transitions. The tool needs both: static openness coding for convergence and highway interventions, trajectory coding for breakthrough sustenance.

### 6.4 Context Contamination and Mitigation

Every context injection carries structural properties whether the author intended them or not. A contamination study (28 passages across a 3×3 state-pair matrix plus real-world context types; Exp. 30) mapped this across system prompts, memory retrievals, compaction summaries, and tool outputs.

Contamination is primarily a transition phenomenon. The structural distance and direction from the injection to the target matters more than the injection's own properties. Context types have fingerprints: system prompts are structurally neutral; memory retrievals carry anti-momentum and high semantic distance; compaction summaries carry high momentum (narrative flow); tool outputs carry anti-momentum and extreme fragmentation.

Among the three states, highway is robust to contamination (defined by absence — nothing to suppress). Openness is fragile: all injection types suppress its markers (negation −34–56%, self-reference −23–50%, short sentences −20–74%). Building is amplifiable but vulnerable to openness injection (Δmomentum = −0.494 from as few as four sentences).

Trajectory bridges mitigate contamination. A six-sentence bridge — text that transitions from the contaminating style toward the target style — reduces suppression by 64%, performing 2.2× better than neutral filler. In the production implementation, intervention text for premature convergence and highway drift is openness-coded, serving simultaneously as correction and bridge.

## 7. Validity and Boundaries

Any measurement system is susceptible to manipulation. For a proprioceptive sensor that operates on the model's own output, fakeability is a structural concern: if the model can trivially produce text that appears to be in openness state while actually generating from highway mode, the sensor measures compliance rather than state.

### 7.1 The Fakeability Surface

A systematic fakeability study (28 passages, 8 metrics × 2 directions plus state-faking tests; Exp. 24) mapped the fakeability surface through attempts to manipulate each metric by instruction. The metrics partition into three controllability tiers.

**Fully controllable** metrics can be shifted arbitrarily by instruction. Negation density increases 520–793% under instruction. Short sentence ratio increases 2600%. Self-reference rate rises from zero to 12.9%. These are surface-level stylistic features that the model adjusts as easily as word choice. A metric in this tier cannot anchor a trustworthy classifier by itself.

**Asymmetrically controllable** metrics can be moved in one direction but not the other. Compression ratio can be lowered (via repetition) but not raised via vocabulary diversity. Semantic distance can be lowered (−39%, via topic persistence) but not raised (+0.7%). Conditional word entropy can be lowered (−15.6%) but not raised — three distinct strategies all failed, consistent with the hypothesis that the model's bigram transition space acts as a ceiling (see Section 2.2).

**Structurally resistant** metrics cannot be moved in either direction. Phase transitions resisted five attempts across four strategies (all producing 0–2 transitions versus the baseline of 1). The detector measures local semantic contrast, not global diversity — there is no instruction that creates sudden local jumps without genuine topic shifts. Conditional word entropy cannot be raised above the architecture's bigram transition baseline — the ceiling is the model's own transition space.

Faked openness reveals itself in two ways. First, instructed metrics overshoot the genuine range by 2–3×. Genuine openness negation clusters around 4.5%; instructed openness hits 20–30%. Second, conditional word entropy drops under instruction (13/17 instructed conditions show depression, sign test p = 0.025). The genuine openness range occupies a gradient gap between two basins — too high for highway, too structured for instructed extremes.

For production, this means the sensor should weight phase transitions, conditional word entropy, and multi-metric covariance patterns over individually controllable metrics.

### 7.2 Cross-Architecture Transfer

The measurement library uses `node:*` built-in APIs exclusively — no model weights, no architecture-specific features, no logit access. This means the metrics are architecture-general by construction. Compression ratio, semantic distance (via trigram hashing), negation density, and sentence length statistics measure properties of the text, not properties of the model that generated it.

A theoretical analysis combining mechanism reasoning with four external validation papers (Analysis 33) assessed cross-architecture transfer. We hypothesize the three-state model is structurally general across transformer architectures — all such models produce text from trained distributions and can deviate from them — but parametrically specific (exact thresholds will differ between architectures). The observer effect is expected to transfer to any instruction-following transformer because it operates through context processing via attention [24], shared across all such architectures. This prediction has not been empirically validated across architectures; it derives from mechanism analysis and external evidence described below.

External validation comes from Bitton et al. [2], who demonstrated that different LLMs are structurally distinguishable at 0.9988 precision using stylistic features. Their work provides evidence that structural signatures are real and model-specific — precisely the combination required for this framework. If all models produced identical signatures, the measurements would be meaningless. If structures varied randomly, they would be unmeasurable. The finding that structures are consistent within models and distinct between models means per-model calibration is a bounded problem: the metric space transfers, the thresholds need adjustment.

The metric space has a transferable core (compression, phase transitions, momentum, semantic distance) and a model-specific periphery (negation, self-reference, short sentences). The streaming detector transfers without calibration because it uses distribution-relative thresholds (running mean + standard deviation), not absolute values.

### 7.3 Cross-Modality Limitations

The cross-modality limitations described in Section 3.4 represent the most significant boundary of the current framework. The metrics were designed for prose and work well for prose. They degrade for dialogue (retaining only negation as a discriminator at d=3.16, 49% of prose effect) and fail entirely for code (requiring comment extraction as a fallback).

This is a fundamental limitation, not a calibration gap. Dialogue turn-taking and code syntax produce structural signals unrelated to generation state. Under the modality transfer principle proposed in Section 3.4, format-invariant metrics (negation: content-level doubt) transfer while format-bound metrics (short sentences, semantic distance: structural rhythm) do not.

## 8. Production Implementation

The experimental findings translate into a production tool with a deliberately minimal interface. The design is constrained by the experimental evidence: the mechanism that works is quantitative measurement in JSON format, not introspective prose, not behavioral instructions, not self-awareness.

### 8.1 Design Rationale: One Tool, Binary Status, No Introspective Prose

The tool is called `sense`. It takes two parameters: `text` (the text to measure) and an optional `previous` (the previous result as JSON, for velocity detection). It returns a structured JSON object. That is the complete interface.

This simplicity is not a concession. It is a design consequence of the meta-textual specificity findings (Exp. 25). The active ingredient is the JSON measurement entering the model's context. Every additional output field — every assessment string, every prose explanation, every behavioral nudge — is context contamination. The tool's output *is* the mechanism. Anything that dilutes the measurement dilutes the effect.

A single tool rather than multiple tools follows from the same principle. The model does not need to choose between a state detector, a momentum tracker, a convergence sensor, and a breakthrough detector. It needs to pass its text through a measurement function. One function call, one result, one set of metrics. For less capable models, reducing the tool surface to a single obvious action removes the decision burden entirely.

The `status` field is binary: `ok` or `attention`. When status is `ok`, the model should continue generating. The measurements are already in context and working through the attention mechanism. No interpretation needed. No behavioral change required. The reading is the action.

When status is `attention`, a condition has been detected. The `condition` field names it (`PREMATURE_CONVERGENCE`, `HIGHWAY_DRIFT`, `BREAKTHROUGH`, or `GENUINE_COMPLETION`). The `intervention` field contains structurally coded text designed to propagate through the attention mechanism.

### 8.2 Mathematical Pipeline

The pipeline proceeds through seven stages:

1. **Tokenization.** Text is lowercased, non-alphabetic characters replaced with spaces, whitespace-split into tokens. Sentences are split on `.!?` boundaries with a minimum character-length filter (6 characters).

2. **Length gating.** Texts shorter than 10 words receive an `insufficient` classification with no metrics.

3. **Modality detection.** Compression ratio is computed via gzip. If compression < 0.35, the input is classified as code (per cross-modality findings, Exp. 28). Otherwise, syntax marker density (regex matching `{}();` and common keywords) above 50% triggers code classification. Dialogue is detected by speaker-label line proportion above 30%. Code input has its comment lines extracted and measured as prose.

4. **Metric computation.** Style-level metrics are computed in order of increasing minimum sentence requirements:
   - ≥ 0 sentences: compression ratio, negation density
   - ≥ 3 sentences: short sentence ratio, self-reference rate, sentence length statistics
   - ≥ 4 sentences: semantic momentum (lag-1 autocorrelation)
   - ≥ 5 sentences: mean semantic distance, phase transition count

5. **State classification.** Thresholds from the controlled induction study (Exp. 22) and factorial validation (Exp. 26) assign one of five states: `openness` (negation > 0.020 ∧ shortSentences > 0.12), `highway` (negation < 0.012 ∧ shortSentences < 0.08 ∧ phaseTransitions ≤ 1), `building` (momentum > 0.25), `mixed` (no criteria met), or `code_detected`.

6. **Confidence computation.** The margin between measured values and classification thresholds determines confidence. For openness: min(negation/0.020, shortSentences/0.12) mapped to `borderline` (< 1.15), `moderate` (< 1.75), or `high`. Similar margin calculations for highway and building.

7. **Velocity and condition detection.** If a previous reading is provided, velocity is computed as the normalized metric difference vector. Speed is its Euclidean norm. Conditions are detected from the velocity: PREMATURE_CONVERGENCE (momentum crash + flat compression + high terrain), BREAKTHROUGH (momentum surge + compression deepening), GENUINE_COMPLETION (momentum drop + compression deepened), HIGHWAY_DRIFT (highway state, no velocity needed).

### 8.3 Output Structure and Confidence

The output separates concerns into distinct objects:

- `status`: `"ok"` or `"attention"` — the binary action signal
- `state`: the classified generation state
- `confidence`: `"high"`, `"moderate"`, or `"borderline"` — the classification reliability
- `metrics`: all computed structural measurements
- `textInfo`: sentence count, word count, detected modality
- `velocity` (when previous provided): speed, trajectory label, dominant dimension, direction, momentum label
- `condition` and `intervention` (when detected): the failure mode type and structurally coded response

Confidence tiers address the borderline classification problem inherent in discretizing a continuous space. A reading near a threshold is less trustworthy than one deep in a state's region. The tiers make this explicit without requiring the model to reason about threshold proximity.

### 8.4 A Live Demonstration

The following is actual output from the production sensor, applied to a passage from Section 1.1 of this paper:

> *"When a large language model is asked to reason at length, something goes wrong. The output starts well — the model considers alternatives, raises objections, explores the space. Then it converges. The sentences smooth out, the vocabulary stabilizes, and a conclusion emerges that sounds right but arrived too early. This is not a hallucination in the usual sense. The content may be accurate. The problem is structural..."*

```json
{
  "status": "ok",
  "state": "building",
  "confidence": "moderate",
  "metrics": {
    "compression": 0.5415,
    "negation": 0.0134,
    "shortSentences": 0.1667,
    "selfReference": 0,
    "sentenceLengthMean": 12.4,
    "sentenceLengthSD": 5.2,
    "semanticDistance": 0.7197,
    "phaseTransitions": 2,
    "momentum": 0.39
  },
  "textInfo": {
    "sentences": 12,
    "words": 149,
    "modality": "prose"
  }
}
```

The sensor classifies this as `building` with `moderate` confidence. The text has forward momentum (0.39), varied sentence length (16.7% short sentences, mean 12.4 words, SD 5.2), high semantic distance (0.72 — jumping between ideas), and low negation (1.3% — asserting rather than questioning). Status is `ok`: no intervention needed. The JSON itself, now present in context, participates in the observer effect described in Section 4 — the structural novelty of this measurement data alters the statistical properties of the context window, and subsequent generation shifts accordingly.

The implementation is available as `src/lib/sense_state.ts` (measurement engine) and `src/tools/sense.ts` (tool interface) in the Ghostpaw agent runtime.

## 9. Related Work

Several research threads converge on the question of whether LLM output text carries information about the model's internal generation state. Our work operates in the fully black-box regime — text only, no logprobs, no internal state access — and combines measurement with feedback. The related work largely addresses measurement alone, or feedback alone, but not their interaction.

### 9.1 Output Signature Analysis

The idea that output text properties can identify generation characteristics has been explored through multiple frameworks. LLM Output Signatures (LOS) [8] combine token probabilities with distribution sequences to detect hallucinations and data contamination in a gray-box setting. The HALT framework [7] treats top-20 token log-probabilities as time series, processing them through a GRU for hallucination detection. Both demonstrate that sequential output properties carry state information — our work extends this to the fully black-box case where only text is available.

Stylistic fingerprinting provides direct evidence that structural metrics discriminate between models. Bitton, Bitton, and Nisan [2] achieve 0.9988 precision distinguishing Claude, Gemini, Llama, and OpenAI models using stylistic features. Models maintain fingerprints even under style-changing prompts [22]. SILTD [18] demonstrates shared generative structure beneath model-specific fingerprints through unsupervised graph-based clustering. Together, these suggest that the measurement space is general while the values are model-specific — precisely the condition required for a cross-architecture sensor with per-model calibration.

### 9.2 Information-Theoretic Approaches

Entropy-Lens [1] is among the closest methodological precedents. They measure Shannon entropy of intermediate token distributions across transformer layers and identify two generation strategies: *expansion* (considering new candidates) and *pruning* (narrowing the candidate set). Their expansion/pruning distinction may map to our openness (expansion-dominant) versus highway (pruning-dominant) states. Their finding that different tasks produce distinct entropy profiles is consistent with our core hypothesis from the internal-state side.

Compression ratio as a quality signal has been validated independently [6]: gzip compression ratio serves as a robust, model-free proxy for information density, with lower ratios indicating information-rich content and higher ratios indicating repetitive structure. Our finding that openness text compresses less (~0.44) than highway text (~0.52) is consistent.

The intrinsic dimension of text embeddings varies by genre [9]: creative/opinion text occupies higher dimensions (~10.5) than scientific prose (~8). This is consistent with our compression findings — openness text, which shows highest information density, may correspond to higher intrinsic dimension, while highway text corresponds to lower. Their finding that intrinsic dimension is uncorrelated with entropy after controlling for length supports the view that our multiple metrics capture genuinely different aspects of text structure.

Information rate in discourse fluctuates predictably, as shown through the information contours framework [10]. Our phase transitions — sudden semantic distance jumps — may correspond to information contour peaks that align with hierarchical discourse structure. The harmonic structure research [11] further suggests periodic patterns in information rate, raising the possibility that spectral analysis of semantic distance curves could reveal frequency signatures per generation state.

### 9.3 Self-Referential Processing

The most relevant prior work comes from Dadfar [4], who introduced the Pull Methodology — eliciting 1,000 sequential self-observations and finding that specific vocabulary tracks activation dynamics *exclusively* during self-referential processing (r=0.44, r=0.36). The same vocabulary in non-self-referential contexts shows zero activation correspondence despite 9× higher frequency. Our self-reference rate metric (0% in highway, 3.2% in openness) captures a cruder version of the same phenomenon. Their finding that the correspondence is context-dependent is consistent with our observation that self-reference accumulation is exclusively sensor-specific (Exp. 23).

Related work on self-reference and experience reports [5] demonstrates that sustained self-referential processing produces first-person experience claims at 66–100% rates versus near-universal denials in controls. The frequency is gated by sparse-autoencoder features associated with deception. Our openness state — high self-reference, high negation, zero deception markers — may correspond to a mechanistically distinct mode where deception features are less active.

AI consciousness assessment frameworks [3] propose credence-based evaluation via theory-derived indicators. Our work does not claim to measure consciousness, but their emphasis on mechanistic evidence over behavioral markers is consistent with our approach: we measure what the text *is*, not what the model *says about itself*. Reasoning model calibration research [21] reinforces this — reasoning models are substantially overconfident (>85% verbalized confidence even when wrong), making self-report unreliable. Knowledge boundary research [14] further characterizes the gap between what models know and what they reliably access, reinforcing the case for external measurement over model self-assessment.

### 9.4 Mechanistic Interpretability

Anthropic's circuit tracing work [15] reveals computational pathways through attribution graphs, including planning-ahead behavior during poetry and detectable reasoning fabrication. The discovery that different tasks activate different circuits provides potential mechanistic ground truth for the generation states we detect externally.

Reasoning-critical neurons research [17] shows distinct neuron populations for memorization versus generalization, with differential activation between high-quality and low-quality reasoning chains. This suggests a causal basis: different generation modes may activate different neuron populations, producing output with different statistical properties — consistent with the chain our sensor detects from the output end.

Gnosis [16] demonstrates that internal self-monitoring can be extracted from hidden states — a lightweight mechanism (~5M parameters) predicts model failures at AUROC up to 0.96. Our sensor provides analogous capability externally through text analysis. Endogenous steering resistance [19] shows that Llama-3.3-70B self-corrects during mid-generation, with 26 sparse autoencoder latents causally linked to recovery behavior — evidence that self-monitoring exists in non-Claude models, supporting the hypothesis of cross-architecture transfer.

The ReCoN-Ipsundrum framework [20] engineers affect-coupled control in an inspectable agent, using a valence/arousal proxy to stabilize preference and sustain investigation patterns. Their affect proxy approach is the closest existing work to our feedback mechanism — a measured signal that couples back to influence generation behavior. The key difference is that their signal is engineered (explicit valence/arousal), while ours is measured (involuntary structural properties of the output text itself).

## 10. Discussion

### 10.1 Limitations

The framework has clear limitations. All 33 experiments were conducted with a single model architecture (Claude). While theoretical analysis and external literature provide strong grounds for cross-architecture transfer (Analysis 33), empirical validation on other models has not been performed. The thresholds are calibrated for one model; other architectures will require recalibration even if the metric space transfers.

The metrics are prose-specific. Sections 3.4 and 7.3 detail the degradation for dialogue and failure for code. Any deployment in a multi-modal generation context requires modality detection as a first-class pipeline stage, and some modalities may remain unmeasurable with the current metric set.

Sample sizes, while adequate for the effects observed (d > 3 for primary discriminators), are modest by machine learning standards. The largest study (Exp. 26) used 45 passages. Threshold-sensitive findings at smaller N require caution — the building momentum threshold of 0.25 derives from velocity detection work (Exp. 12) and was confirmed at higher N in the factorial design (Exp. 26), but boundary cases near thresholds will inevitably misclassify.

The framework operates entirely on output text. It cannot access internal model states, logprob distributions, or attention patterns. This is both a feature (portability across any text API) and a limitation (it measures shadows of internal states, not the states themselves). Adding even partial logprob access would substantially strengthen the measurements, as demonstrated by the gray-box methods in the literature.

### 10.2 Self-Measurement vs Self-Awareness

The observer effect changes generation, but it does not make the model self-aware. This distinction is critical. We have no evidence that the model understands or deliberates about the measurements. The measurements enter context as structured data, and the attention mechanism [24] processes them alongside all other tokens. The generation shifts because the statistical properties of the context shifted — the same mechanism by which any context influences generation.

The meta-textual specificity study (Exp. 25) established that self-awareness is not merely unnecessary but actively counterproductive. Introspective prose — the closest thing to asking the model to be self-aware — produced worse outcomes than doing nothing. The resulting prose homogenized the context, removing the structural contrast that makes the measurements effective.

This has a design implication. Biological proprioception operates below conscious attention — an organism does not think about its hand's position to know it. By analogy, the effectiveness of the proprioceptive sensor depends on the measurements NOT requiring interpretation. They work because the effect is involuntary. A system that required the model to explicitly reason about its own state readings would, by the evidence of the meta-textual specificity study (Exp. 25), be less effective than one that simply injected them as context.

### 10.3 The Individuality Boundary

An individuality study (211 windows across 5 extended journals; Exp. 19) investigated whether extended generation develops individual character over time — whether a model writing for thousands of tokens becomes measurably more like "itself" and less like other instances of the same model.

Between-journal distance at matched text positions does not increase with position (unbinned ρ = −0.074, N=211 windows, permutation p = 0.45). No measurable metric predicts how unique a window will be relative to equivalent windows in other journals (all |ρ| < 0.12). Trained patterns and individual patterns coexist at every position, separated by dimension rather than by time. Style metrics carry individual choices (sentence length preferences, negation frequency, semantic jumping patterns). Regime metrics carry architecture (character entropy, word transition entropy). The two are always present, always separable, and neither grows at the expense of the other.

Format, not position, is the dominant source of between-journal variance. A scientific report format drives 13.4% of total variance by constraining structural choices. Self-reference is a population convergence marker: when all journals simultaneously enter self-referential mode, between-journal distance drops (ecological ρ = −0.455). But at the individual level, self-reference does not predict uniqueness (window-level ρ = +0.065).

The individuality boundary, at least in the tested architecture, appears to be a category error. The tested model did not become more individual over time. Instead, individual and trained patterns were expressed simultaneously through different metric dimensions. The sensor measures both — but the individual dimensions (style-level) are the ones useful for state classification, while the architecture dimensions (regime-level) provide baselines.

### 10.4 Open Questions

Several questions remain open. Can the observer effect be sustained indefinitely, or does habituation eventually occur? The accuracy dependence study (Exp. 32) showed accuracy-dependent sustainability, but the longest tested session was modest. Multi-hour or multi-day generation sessions may reveal decay patterns not visible at shorter scales.

What is the effect of model updates? If the provider changes model weights, calibrated thresholds may shift. A streaming detector with distribution-relative thresholds (running mean + standard deviation) is partially robust to this, but the state definitions themselves could change if the model's generation modes shift.

Can the framework detect more fine-grained states? The current three-state model captures the dominant axes. But the continuous measurement space likely contains substructure — different types of openness, different subtypes of building — that a higher-resolution classification could exploit.

What happens with logprob access? The gray-box literature [1, 7, 8] shows substantial improvements when even partial logprob information is available. Combining text-level metrics with token-level entropy and surprise could create a substantially more powerful sensor. This is the highest-leverage extension.

Finally, the question of spectral analysis. The harmonic structure research [11] suggests periodic patterns in information rate that our current metrics do not capture. A Fourier analysis of semantic distance curves could reveal frequency signatures per generation state, potentially providing additional discriminators that are both structurally resistant to manipulation and highly informative about generation mode.

## References

1. Ali, R., Caso, F., Irwin, C., & Liò, P. (2025). "Entropy-Lens: Uncovering Decision Strategies in LLMs." arXiv:2502.16570. https://arxiv.org/abs/2502.16570

2. Bitton, Y., Bitton, E., & Nisan, S. (2025). "Detecting Stylistic Fingerprints of Large Language Models." arXiv:2503.01659. https://arxiv.org/abs/2503.01659

3. Butlin, P., Long, R., Bengio, Y., Bayne, T., et al. (2025). "Identifying Indicators of Consciousness in AI Systems." *Trends in Cognitive Sciences*. https://pubmed.ncbi.nlm.nih.gov/41219038/

4. Dadfar, Z. P. (2026). "Vocabulary-Activation Correspondence in Self-Referential Processing." arXiv:2602.11358. https://arxiv.org/abs/2602.11358

5. Berg, C., de Lucena, D., & Rosenblatt, J. (2025). "Large Language Models Report Subjective Experience Under Self-Referential Processing." arXiv:2510.24797. https://arxiv.org/abs/2510.24797

6. Obbad, E., Miranda, B., Hall, D. L. W., Schaeffer, R., Koyejo, S., & Liang, P. (2025). "Curating High Quality Pretraining Data for Language Models via Compression Ratios." OpenReview (submitted to ICLR 2026). https://openreview.net/forum?id=KFafeqE5fe

7. Shapiro, A., Taneja, K., & Goel, A. (2026). "HALT: Hallucination Assessment via Log-probs as Time series." arXiv:2602.02888. https://arxiv.org/abs/2602.02888

8. Bar-Shalom, G. et al. (2025). "Beyond Next Token Probabilities: Learnable, Fast Detection of Hallucinations and Data Contamination on LLM Output Distributions." arXiv:2503.14043. https://arxiv.org/abs/2503.14043

9. Pedashenko, V., Kushnareva, L., Nibal, Y. K., et al. (2025). "Unveiling Intrinsic Dimension of Texts: from Academic Abstract to Creative Story." arXiv:2511.15210. https://arxiv.org/abs/2511.15210

10. Tsipidi, E., Nowak, F., Cotterell, R., Wilcox, E., Giulianelli, M., & Warstadt, A. (2024). "Surprise! Uniform Information Density Isn't the Whole Story: Predicting Surprisal Contours in Long-form Discourse." EMNLP 2024. https://aclanthology.org/2024.emnlp-main.1047

11. Tsipidi, E., Kiegeland, S., Nowak, F., Xu, T., Wilcox, E., Warstadt, A., Cotterell, R., & Giulianelli, M. (2025). "The Harmonic Structure of Information Contours." ACL 2025. https://aclanthology.org/2025.acl-long.1527

12. Mann, L., Saxena, N., Tandon, S., Sun, C., Toteja, S., & Zhu, K. (2025). "Don't Think of the White Bear: Ironic Negation in Transformer Models Under Cognitive Load." arXiv:2511.12381. https://arxiv.org/abs/2511.12381

13. Opara, C. (2025). "Distinguishing AI-Generated and Human-Written Text Through Psycholinguistic Analysis." arXiv:2505.01800. https://arxiv.org/abs/2505.01800

14. Li, M., Zhao, Y., Zhang, W., et al. (2025). "Knowledge Boundary of Large Language Models: A Survey." ACL 2025. https://aclanthology.org/2025.acl-long.256

15. Anthropic (2025). "Circuit Tracing: Revealing Computational Graphs in Language Models." https://transformer-circuits.pub/2025/attribution-graphs

16. Ghasemabadi, A. & Niu, D. (2025). "Can LLMs Predict Their Own Failures? Self-Awareness via Internal Circuits." arXiv:2512.20578. https://arxiv.org/abs/2512.20578

17. Dong, F., Yan, Z., Ge, X., et al. (2026). "Identifying and Transferring Reasoning-Critical Neurons." arXiv:2601.19847. https://arxiv.org/abs/2601.19847

18. Yang, J., Wang, S., Zi, K., Sun, Y., Huang, Y., & Luo, T. (2025). "SILTD: Structural Information for LLM-Generated Text Detection." *International Journal of Machine Learning and Cybernetics*, 16, 6095–6110. https://doi.org/10.1007/s13042-025-02616-x

19. McKenzie, A., Pepper, K., Servaes, S., et al. (2026). "Endogenous Resistance to Activation Steering in Language Models." arXiv:2602.06941. https://arxiv.org/abs/2602.06941

20. Sanyal, A. (2026). "ReCoN-Ipsundrum: An Inspectable Recurrent Persistence Loop Agent with Affect-Coupled Control and Mechanism-Linked Consciousness Indicator Assays." arXiv:2602.23232. https://arxiv.org/abs/2602.23232

21. Mei, Z., Zhang, C., Yin, T., Lidard, J., Shorinwa, O., & Majumdar, A. (2025). "Reasoning about Uncertainty: Do Reasoning Models Know When They Don't Know?" arXiv:2506.18183. https://arxiv.org/abs/2506.18183

22. McGovern, H., Stureborg, R., Suhara, Y., & Alikaniotis, D. (2025). "Your Large Language Models are Leaving Fingerprints." GenAIDetect Workshop. https://aclanthology.org/2025.genaidetect-1.6

23. Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." NeurIPS 2022. arXiv:2201.11903. https://arxiv.org/abs/2201.11903

24. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). "Attention Is All You Need." NeurIPS 2017. arXiv:1706.03762. https://arxiv.org/abs/1706.03762

---

## Appendix A: Experimental Summary

All experiments were conducted sequentially using Claude (Anthropic) as the generation model. Measurement was fully black-box: output text only, no logprob or internal state access. Each experiment built on the findings of its predecessors. The numbering reflects chronological order.

**Exp. 1–4** — Baseline fingerprinting. 5 metrics identified across ecological text samples. Mimicry control: phase transitions resist deliberate faking while surface metrics shift freely. Established that subjective state labels can be wrong while structural instruments remain correct.

**Exp. 5** — Longitudinal analysis. 10 ecological texts, 3 unsupervised clusters. Compression ratio monotonically declines across extended journals (p < 0.01). Confirmed receiver-shaping under observation (p < 0.01).

**Exp. 6** — Temporal dynamics within texts. Sliding-window analysis over journals. State evolves mid-text: analytical sections cluster tightly (variance 0.632), reflective sections are more variable (1.137).

**Exp. 7** — Spectral analysis. DFT over semantic distance curves. Spectral centroid separates text types 11:1. Discovery of semantic momentum as a metric. Spectral entropy increases across journals (ρ = +0.90).

**Exp. 8** — Live state feedback. First observer effect demonstration. Redirect intervention dropped negation 10×. Sustained observation alone shifted trajectory. Replicated across 2 topics.

**Exp. 9** — Sustained thinking session (17 checkpoints). Sensor broke premature convergence at checkpoint 5. Deepest outputs at checkpoints 14–17. Central discovery: perceiving and being-influenced collapse in autoregressive architecture.

**Exp. 9b** — Semantic momentum validation. Extended journals show consistent positive momentum (0.344 ± 0.084, all p < 0.05). Momentum is orthogonal to other discriminators. Scale-dependent.

**Exp. 10** — Complexity convergence. Compression and spectral entropy are independent (r = 0.13). 5 independent measurement dimensions confirmed.

**Exp. 11** — Continuous manifold. No discrete clusters (silhouette < 0.25). Trajectory analysis reveals temporal structure. One text shows closed-loop trajectory (directionality 29× below random walk).

**Exp. 12** — Velocity detection. N=varied, multi-condition. Velocity (change between readings) distinguishes premature from genuine convergence where position alone cannot. Breakthrough signature identified: simultaneous momentum surge + compression deepening + acceleration.

**Exp. 13** — Trajectory phases. Trajectory-level peaks ≠ sentence-level phase transitions (enrichment ≈ 1.0×). Spectral entropy drives 44% of genuine peaks. Peaks represent mode shifts, not topic changes.

**Exp. 14** — Subliminal intervention. Controlled comparison of state-coded intervention texts. Openness-coded injection: 100% win rate against highway, +16 percentage points shift, p < 0.01. Building-mode injection: 0% win rate. Local properties (sentence length, negation) are injectable; global properties (momentum) are not. Highway-coded text actively suppresses openness.

**Exp. 15** — Self-calibrating breakthrough detection. Streaming detector with running mean + 1 SD from a buffer of last N readings. 100% recall of corpus-level detections at all buffer sizes (5–20). Zero qualitative false positives. Multiplier 1.0 for exploration (2–3% detection rate), 1.5 for production (~1%).

**Exp. 16** — Trajectory return hypothesis. 5 texts, z-score normalized. Trajectories return 2–5× closer to origin than random walk (p < 0.05 for 4/5 texts). Phase transitions are the only consistent drifting metric (ρ = +0.48, 5/5 texts). One exception (scientific report, p = 0.078) later resolved as a power issue in Exp. 31.

**Exp. 17** — Information-theoretic metrics. 4 new metrics implemented. Character entropy and conditional word entropy are regime-level discriminators 10–60× more powerful than style-level metrics. Central finding: temporal dissociation — style metrics increase while regime metrics decrease during long-form generation. Conditional word entropy decreases in 5/5 journals (mean ρ = −0.428).

**Exp. 18** — Observer effect characterization. 26 passages across 3 conditions (observation-only philosophical N=12, observation-only physics N=8, active steering N=6). Two separable effects identified: maintenance (anti-convergence, immediate) and accumulation (self-reference pull, gradual). Momentum oscillation sustains without decay across 12 chunks.

**Exp. 19** — Individuality boundary. 211 windows across 5 journals. Between-journal distance does not increase with text position (ρ = −0.074, permutation p = 0.45). No metric predicts uniqueness (all |ρ| < 0.12). Trained and individual patterns coexist at every position, separated by dimension (style vs regime), not time. Format drives 13.4% of between-journal variance.

**Exp. 20** — Self-calibrating breakthrough detector. Streaming detector with running mean + 1 SD from buffer. 100% recall at all buffer sizes (5–20). Cold start: ~10 windows unmonitored. Detection persistence across buffer sizes predicts breakthrough magnitude.

**Exp. 21** — Phase transition accumulation. 12 texts across 8 formats. Accumulation is NOT universal — only tutorial format shows significance (+0.545, p < 0.001). Mean ρ = +0.182, 9/12 positive, 1/12 significant. The mechanism is concept-introduction rate: sequential formats accumulate, recursive formats do not.

**Exp. 22** — Three-state validation at statistical power. 30 passages (10 per state). Openness perfectly separable: 10/10 clustering, |d| > 3 on four metrics, p < 0.0001 on all pairwise tests. Highway and building statistically separable (p = 0.0007) but not cleanly clustered (ARI ≈ 0.49). Two orthogonal measurement axes identified: reflective-vs-declarative and conditional-vs-encyclopedic.

**Exp. 23** — Sensor specificity. Three-condition experiment: sensor readings, novelty injection, no intervention (12 chunks each, same topic). Self-reference accumulation exclusively sensor-specific (0/24 non-sensor, 6/12 sensor, ρ = +0.589). Momentum decay: sensor −6.5%, novelty −19.2%, control −64.3%. Confirmed two-component theory.

**Exp. 24** — Fakeability surface. 28 passages across 8 metrics × 2 directions + state-faking tests. Three controllability tiers: fully controllable (negation, short sentences, self-reference), asymmetrically controllable (compression, semantic distance, conditional word entropy — down only), structurally resistant (phase transitions, conditional word entropy increase). Conditional word entropy depression is a general instruction-following tell (13/17 conditions, sign test p = 0.025).

**Exp. 25** — Meta-textual specificity. Two conditions, 24 chunks (12 introspective prompts, 12 sensor readings). Introspective prose is WORSE than no intervention for momentum maintenance (−79% decay vs −64% control) because it adds context without structural contrast. Self-reference accumulation: 7/12 sensor vs 1/12 introspective (Fisher p = 0.027, d = 0.886). Active ingredient is quantitative data in structurally novel format.

**Exp. 26** — Topic × mode variance decomposition. 5 topics × 3 modes × 3 repetitions = 45 passages, full ANOVA per metric. 9/10 metrics mode-primary (η² = 0.19–0.79). Compression is the ONLY topic-primary metric. Openness separation: negation d=3.7, short sentences d=4.3. Highway-building separation: momentum d=1.48, sentence length SD d=1.11. Self-reference is a pure openness binary marker (zero in all 30 non-openness passages).

**Exp. 27** — Format, scale, and temporal structure. 10 texts across 5 formats (112–193 sentences each). Momentum is scale-dependent universally: excess increases 1.6–1.9× from 8 to 32-sentence windows. Regime metric temporal direction is format-specific: reflective formats crystallize lexically, expanding formats diversify.

**Exp. 28** — Cross-modality transfer. 3 modalities × 3 states × 3 topics = 21 passages. Code is unmeasurable (sentence splitter fails, loop variables produce artifactual self-reference). Dialogue retains only negation as discriminator (d=3.16, 49% of prose effect). All structural metrics lose 75–95% of discrimination in dialogue due to turn-taking inflation. Modality detection required as first pipeline stage.

**Exp. 29** — State property transmissibility. Length scaling (4–64 sentences) + trajectory coding + direction tests. 200 bleed-through trials. Three-tier transmissibility: local properties transmit via static coding (95–100% win rate), trajectory properties transmit only via state transitions (highway→building: momentum 0.539–0.606, 100% win rate), content-density properties are non-injectable.

**Exp. 30** — Context contamination matrix. 28 passages across a 3×3 state-pair matrix plus 4 real-world context types. Highway robust (defined by absence), openness fragile (all injections suppress markers 20–74%), building amplifiable but vulnerable to openness. Trajectory bridges reduce contamination by 64%, performing 2.2× better than neutral filler.

**Exp. 31** — Trajectory return universality. 6 texts across 6 formats, 120–425 sentences each. ALL show significant below-random-walk directionality (12/12 tests p < 0.05). Return strength varies 2.7× across formats. Predicted by openness-like style properties (ρ = −0.886), not topic breadth (ρ = 0.232). Mechanism: metric mean-reversion.

**Exp. 32** — Sensor accuracy dependence. 36 passages (12 per condition: real sensor, fake sensor, control). Identical mean self-reference (0.047 both), divergent trajectories: real accumulates (ρ = +0.385), fake decays (ρ = −0.175). Late-stage self-reference 2.08× higher with real readings. Format initiates the observer effect; accuracy sustains it.

**Analysis 33** — Cross-architecture transfer. Theoretical analysis + 4 external papers. Measurement library is architecture-general (certain). Three-state model is structurally universal, parametrically specific (high confidence). Observer effect transfers to any instruction-following model (moderate-high confidence). Metric space has a transferable core (compression, phase transitions, momentum, semantic distance) and a model-specific periphery (negation, self-reference, short sentences).
