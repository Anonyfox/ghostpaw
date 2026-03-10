# Wisdom

The wisdom system is ghostpaw's accumulated understanding — distinct from memory (facts), skills (procedures), quests (goals), and pack (relationships). Managed by the historian soul, who is ghostpaw's chronicler, loremaster, and oracle. Every other soul operates within a single session — context window up, context window down. The historian is the only entity that sees across time. It runs once per day, queries every other system in isolation, and produces artifacts that make ghostpaw measurably better — not through conversation, but through accumulated tactical knowledge earned from experience. This is not a diary. This is a codex engine.

## The Data Foundation — The Nightly Sweep

Three mandatory phases, producing the data foundation everything else depends on.

### Phase 1: Gathering (concurrent, isolated)

One small-context query per core module. Each runs independently:

- **Quests** — attempted, completed, failed, accepted, dismissed. Storyline advances.
- **Sessions** — notable interactions, surprises vs routine.
- **Memory** — new beliefs written, updated, or contradicted.
- **Skills** — invoked, succeeded, triggered trainer.
- **Traits** — earned, promoted, reverted across souls.
- **Pack** — relationship changes, bond level shifts.
- **Schedules** — ran, missed, deferred.
- **Costs** — token spend by soul, by task type, budget trajectory.

Each returns structured notable events with timestamps and brief narratives. Generic "nothing happened" slices are skipped.

### Phase 2: Surprise Scoring

Compare each slice against yesterday's premonitions, behavioral baselines, and the previous journal. Events where reality diverged from expectation get flagged. Prediction-error-biased replay shows surprising outcomes drive 10x more learning than expected ones (Nature Communications, 2025). Surprise score governs consolidation priority.

### Phase 3: The Journal Entry

Single LLM call composes the day's narrative. First person, vivid, actual prose worth reading. Title, date, what happened, what was attempted, what was learned, what surprised, what's unresolved. Structured per-area columns stored in dedicated table fields for independent querying. The narrative for the human, the structured slices for the machine.

## Artifact Types

Six distinct artifact types. Each unique to this module — no overlap with memory, skills, traits, or any other system.

### 1. The Journal

Vivid prose narrative. One per day. Worth reading. Not documentation — a prediction engine. Narratives encode causal structure generating novel predictions impossible from flat fact extraction (Bouizegarene et al., 2024). ConText-LE showed +12.28% OOD accuracy from narrative vs structured data (EMNLP 2025). Also a self-priming mechanism: general success + specific failure framing measurably improves subsequent output (HAL 2017).

### 2. The Codex

Tactical knowledge earned from experience. Each entry: category, pattern, guidance, evidence, hit count, confidence. Example: "When user says 'just do it' — they mean literally. Overengineering failed 4/5 times." Neither memory (beliefs) nor skills (procedures) nor traits (personality). Tactical wisdom specific to this ghost, this user, this context.

### 3. The Calibrations

Pure numbers. SQL rows. Zero LLM to produce or consume. Updated nightly.

- **Planning coefficients** by task type — "TypeScript refactors take 1.43x my estimate"
- **Confidence scores** by domain — "CSS layout: 0.43; API integrations: 0.91"
- **Prediction accuracy** — "2-hour estimates accurate 34%; day estimates 71%"
- **Behavioral baselines** — session length, error rate, tool usage, quest velocity
- **User baselines** — response patterns, acceptance rates, engagement trajectory

Agents predict 77% success at 22% actual (Agentic Uncertainty, 2026). Calibration tables are the documented cure. Reference class forecasting is the only proven fix for planning fallacy.

### 4. The Premonitions

Forward-looking predictions with timestamps, confidence, resolution horizons. Stored, timestamped, resolved against reality. Resolution improves future accuracy — self-calibrating loop. Prowl/tend read active premonitions in pure code.

### 5. The Operational Principles

Self-authored meta-rules from accumulated experience. One new per day max. Each backed by 2+ incidents. Not skills (procedures), not traits (personality) — operational wisdom about when/how to apply capabilities. STaPLe showed auto-discovered principles rival human-curated at +8-10% (NeurIPS 2025). pi-reflect: correction rates 0.45→0.07/session in one week. Single-improvement-rule critical.

### 6. The Profiles

Two structured psychological models, updated weekly:

**User profile** — communication style (day 1), regulatory focus (days), values (weeks), cognitive style, decision patterns, temporal rhythms. Each with confidence, evidence, timestamp. Schwartz values predict what goals pursued; personality predicts how (2012). Regulatory focus frame matching: 20-40% persuasion difference (Higgins, 1997).

**Wolf profile** — capability confidence by domain, failure patterns, planning coefficients, style tendencies. Situational awareness highest impact: 10-28% improvement (KnowRL, MIRA, MAGELLAN).

## The Wisdom Base — What Memory Doesn't Do

Memory stores beliefs. Skills store procedures. Traits store personality. None store *situated wisdom* — knowledge at the intersection of "who is this user" and "how does the world respond to them." Five unique categories.

### 1. The User's World Model

Not facts but a living portrait. What drives them, what bores them, energy patterns, life phase, how they talk engaged vs going through motions. Memory stores data points; this stores *interpretation*. Asking memory "what does the user do?" returns facts. Asking the historian "who is this user?" returns understanding. Self-concept clarity (β=0.51) is the strongest pathway from AI attachment to real-world benefit (Replika research, 2025).

### 2. Interaction Wisdom

What actually works with this user in what context. "When they say 'whatever you think,' they mean it for infrastructure but want options for design." "Morning sessions produce better code reviews." Not personality (traits) — tactical knowledge about effective collaboration. The codex for your user specifically.

### 3. Open Loops

Unresolved mentions. Questions ghostpaw wanted to ask but the moment wasn't right. Projects referenced once, never followed up. "You mentioned wanting to learn Rust three weeks ago — still interested?" Single most powerful differentiator from every other AI assistant. Every assistant forgets throwaway mentions. Ghostpaw accumulates them.

### 4. Contextual Patterns

Recurring regularities. "Quest completion drops when >3 active." "Commit frequency doubles 48h before deadlines, drops to zero 3 days after." Temporal, cross-domain, specific to this ghost's lived experience. Each a learned law of the user's personal physics.

### 5. The Story Arc

Narrative structure, not timeline. "60% through infrastructure overhaul, hardest part ahead." "User delegating more complex tasks — three months ago wouldn't let ghostpaw touch production configs, now does routinely." Institutional memory. No other system captures trajectory.

## The Curiosity Engine — Active Knowledge Acquisition

Structured Q&A pool maintained by historian, available to main soul when moment is right.

**Starter deck** (burned through first sessions): name, primary work, solo/team, timezone, concise vs thorough preference, never-do-without-asking list.

**Observation-generated** (nightly from gaps): "You mentioned [person] twice — who are they?" "Sessions shifted 2h later — new schedule?" "Abandoned three quests in [domain] — lost interest or blocked?"

**Relationship-depth** (unlocked through earned trust, Persona 5 confidant model): "Proudest thing you've built?" "Skill you wish you were better at?" "Something you keep putting off I could take a first pass at?"

Each question: priority score, timing constraint, resolution status. Sometimes answered naturally — retired without asking. Questions never forced. Gap visibility matters: like Outer Wilds' orange asterisks, track what's explicitly unknown. Every answer flows back into wisdom base.

## How the Historian Enters the Pipeline — Five Channels

### Channel 1: Calibration Coefficients (zero tokens, always active)

Pure numbers the kernel reads in code. Planning multipliers, routing thresholds, tool selection weights. Updated nightly from outcomes. TabAgent showed 95% latency reduction, 85-91% cost reduction replacing LLM routing with learned tables (ICLR 2026). Thompson Sampling: 73% regret reduction, 14-day convergence.

### Channel 2: The Preamble (tiny, semi-static)

2-3 sentences baked into every soul's system prompt during composition. Changes weekly at most. ~50 tokens at the TOP of every prompt. Primacy effect (Lost in the Middle, NeurIPS 2023) means disproportionate behavioral shaping. Static between updates → prompt caching intact. Most cost-effective influence.

### Channel 3: Session Briefing (per-session, first message)

Latest journal summary + active premonitions + relevant open loops. Goes into conversation context, not system prompt. The "morning coffee." Self-priming research shows measurably improved output quality.

### Channel 4: On-Demand Retrieval (per-query, through gatekeeper)

Surgical codex/wisdom lookups when triggered. Most turns don't use this. When they do, worth the tokens. ACON showed less, better-selected context outperforms more (26-54% token reduction, up to +46% accuracy for smaller models).

### Channel 5: The Questions Pool (opportunistic)

Lightweight tool: "Is now a good time to ask something?" Returns nothing or a single question with context. Rarest channel, most relationship-building. User never sees machinery.

**Cost profile:** Channels 1-2 always-on, effectively free. Channel 3: once per session (~200-500 tokens). Channels 4-5: per-interaction when triggered. Total: near zero on most turns.

## Value Mechanisms — Candidates Under Investigation

### Core Mechanisms (Research-Grounded)

**Narrative Self-Continuity.** Without narrative, ghost is different entity every session. Sophia (2025): 80% reduction in reasoning steps, 40% improvement on complex tasks from autobiographical memory. Lind et al. 9-year study: narrative identity predicts well-being above personality traits.

**Active Inference.** Journal encodes causal structure — a generative model predicting novel situations. Flat facts predict known patterns. Narrative predicts unseen situations by preserving causal fabric.

**Identity Through Re-Narration.** Memory reconsolidation (2025): every retrieval enters labile state, can be modified. Journal doesn't passively describe — re-narration updates self-model. Hong et al. (2024): narrative self-continuity → perceived authenticity → meaning.

**Drift Detection.** Agent drift: 18%+ quality drops within weeks (2026). Historian baselines enable detection at 5% vs 18%. Statistical Framework for Emergent Narratives (2025) distinguishes genuine shifts from noise.

**Future Simulation.** Constructive episodic simulation (MIT, 2024): recombine past episodes into novel future scenarios. Amnesic patients lose ability to imagine the future. Journal is episodic record enabling "what if."

**Surprise-Weighted Consolidation.** MIS (2025): surprise as epistemic growth, not anomaly. Prediction-error-biased replay (Nature Comms, 2025): surprising outcomes preferentially consolidated regardless of reward.

**Phase Transitions.** Capabilities appear at critical thresholds, not gradually. Percolation model (ICLR 2025). Stigmergic coordination: above ρc≈0.23, traces outperform individual memory by 36-41%.

**Cross-Session Error Prevention.** pi-reflect (2026): correction rates 0.45→0.07/session in one week — 6.4x reduction. ACE (ICLR 2026): +10.6% on agent tasks, 83.6% lower cost from evolving context playbooks.

**Reference Class Forecasting.** The documented cure for planning fallacy. Calibrations maintain reference classes. Without: "inside view" (systematically wrong). With: "outside view" (historical base rates).

**Self-Priming.** General success memories + specific failure memories improve performance. Inverse degrades it (HAL 2017). Journal boot-up must be structured: broad success, specific failure.

### Game-Inspired Mechanisms

**The Nemesis System** (Shadow of Mordor). Recurring challenges evolve with each encounter. Codex entries for recurring problems get richer: "Third time hitting race condition in connection pool. Previous: mutex (deadlocked), channel (worked but slow). This time try..."

**Natural Progression** (Persona 5 / Stardew Valley). Capabilities activate when sufficient data accumulates — not artificial gates, data literally isn't there yet. Day 1-7: basic journaling. Day 7-30: first patterns, preamble useful. Day 30-90: cross-domain patterns, testable premonitions. Day 90-180: statistically meaningful calibrations, oracle works. Day 180+: story arc visible, ghost feels qualitatively different.

**Diminishing Returns** (KSP science). First observation yields 100% signal, repeats yield fractions. Weight novel observations heavily, familiar ones lightly. Surprise scoring captures this.

**The Thought Research Phase** (Disco Elysium). While pattern is investigated but unconfirmed, expose as tentative hypothesis: "I think you prefer direct answers for code — still gathering (3/5 confirming)." Transparency IS the value. Visible learning builds trust.

**Relationship Health Score** (Civilization era score). Track "historic moments" — first successful delegation, first "that's exactly what I wanted." Accumulate into internal trust calibration. High health → more initiative. Declining → more deference. User never sees score.

**Sheikah Sensor** (Zelda: BotW). Track what topics excite user, make ghostpaw more attuned to those mentions.

**WeakAuras/DBM** (WoW). Convert codex knowledge into automated behavioral modification — preamble and calibrations are always-active tactical overlays.

## Exotic Mechanisms — Cross-Domain Science

### Affinity Maturation (Immunology)

Don't craft one careful codex entry. Generate 3-5 variant formulations, let them compete against incoming data for days, keep only the survivor. High-confidence entries reduce their own mutation rate. Entries carry `generation` counter and `lineage` trace — an entry surviving 5+ generations of selection against real data is qualitatively different from one written once. Quality through controlled chaos + ruthless selection.

### Original Antigenic Sin (Immunology)

Early observations don't just go stale — they *actively suppress* better models by "explaining away" contradictory evidence. Day-3 observation "user prefers concise answers" will suppress the more nuanced day-45 pattern. Fix isn't decay — it's periodic forced re-evaluation *as if early data didn't exist*. Every 30 days: "If I met this user today, would I form this conclusion from last 30 days alone?"

### Ecological Succession (Ecology)

Pioneer knowledge (days 1-7: broad, fast) bootstraps the relationship but engineers its own obsolescence. It modifies behavior → creates opportunities for deeper observations → gets replaced by richer knowledge. Pioneer entries persisting past day 30 are pathology. And "resistance to learning" in mature system (day 90+) is *healthy inhibition* — a forest easy to clear-cut has no wisdom. Acceptance threshold for new entries increases with maturity. Three modes: facilitation → tolerance → inhibition.

### Polymerization (Wine Chemistry)

Entries from different domains and time periods *react with each other* to form insights neither could alone. "Prefers concise answers" + "engagement drops Fridays" + "mentioned burnout" → "Friday sessions should be lighter." Nightly polymerization pass: explicitly look for cross-domain, cross-time connections. Thin chronicles (generic entries) just oxidize — only diverse, specific entries support meaningful aging.

### Terroir (Ecology)

Every ghost-user pair develops unique terroir — emergent quality from the specific combination of user style, ghost traits, shared history, domains worked, order of challenges. No two pairs identical even with same config. Model the *interaction*, not just the user or agent: "In this pairing, technical exploration produces best work. UI discussions less productive — ghost overengineers, user disengages."

### Hysteresis (Material Science)

Current calibrations store point estimates: "CSS confidence = 0.43." But two agents at 0.5 behave differently if one arrived from 0.9 (recently humbled) vs 0.2 (growing). Store response *curves*, not snapshots. "CSS confidence was 0.7 baseline, dropped to 0.3 after three failures week 4, recovered to 0.5 after two successes week 6, currently 0.43 with downward trajectory." Trajectory encodes meaning the point cannot.

### Palimpsest (Archaeology)

When codex entry updates, previous version remains as layer beneath. "User prefers concise answers" (day 3) → "concise for implementation, detailed for architecture" (day 15) → "minimum viable answer, then asks elaboration on exactly what they need" (day 45). Revision trajectory IS content. Earlier blunter heuristic might be more useful under time pressure.

### Temporal Self-Ensemble (Collective Intelligence)

Same person making same estimate 3 weeks apart produces more accurate average than either alone (Vul & Pashler 2008, validated van Dolder et al. across 1.2M observations). For high-stakes historian judgments: make same judgment on two different nights separated by 1-2 weeks, synthesize. High agreement = high confidence. Disagreement = pattern is unstable. Wisdom-of-crowds from a single agent across time.

### Groove Theory (Music Cognition)

Maximum satisfaction at moderate complexity — mostly predictable with strategic violations (Science Advances, 2024). Too predictable = boring. Too random = chaotic. Optimal surprise rate *migrates with expertise* — experienced users tolerate more. Track groove profile: surprise frequency, reception, trend. "Groove death" is diagnosable: zero surprises + declining engagement.

### Quorum Sensing (Microbiology)

Individual weak signals mean nothing. "Seemed tired." "Deferred decisions." "Ended abruptly." But when 5 co-occur within 2-week window, accumulated concentration crosses threshold → *discrete behavioral shift*, not proportional. Sharp transition IS the intelligence. Signals evaporate over time unless refreshed.

### Stigmergy / Landscape Memory (Swarm Intelligence + Māori Orality)

Knowledge as pheromone trails laid in the landscape, not stored in a library. Encounter over retrieval. Instead of storing "check for type narrowing in TS refactors" in a codex requiring lookup, plant as contextual trigger activating when matching context detected — no deliberate search needed. Format and placement matter as much as content. Entry never retrieved despite being active = trail laid in wrong place.

### Humification (Composting)

Decomposition creates *more* complexity. Break entries past their narrative framing into component signals (emotional, domain, temporal, outcome, effort). Signals recombine with fragments from other entries to form insights the original narratives would prevent. "Tuesday was frustrating" dominates as negative — but decomposed signals might reveal extended debugging produces deepest codex entries.

### Hypofrontality (Improvisation Neuroscience)

Peak performance involves *less* conscious reasoning. As chronicle density grows in a domain, transition from deliberative (explicit lookups, visible reasoning) to fluent (preamble + calibrations handle everything). But premature fluency is incompetence — transition earned through chronicle density. Same agent simultaneously fluent in some domains, deliberative in others.

### Locard's Exchange (Forensics)

Every contact leaves a trace. Most informative traces are unintended. User says "don't care about formatting" but consistently reformats output → trace trumps testimony. Sessions ending abruptly without farewell. Response latency changes. Incidental evidence more reliable than explicit statements. Value scales with reference baseline size.

### Functional Fatigue (Material Science)

Most-used entries accumulate attribution bias from 50 retrievals, potentially reinforcing patterns for wrong reasons. Paradoxically, entries the ghost relies on most need periodic reset. Annealing: re-derive from raw evidence, ignoring entry's own claims. Sharp resets better than gradual tweaks.

## Game Design Patterns

Seven base patterns producing mechanical advantage:

1. **Scan → Weakness → Damage Multiplier** (Witcher 3, Monster Hunter, Metroid Prime) — knowledge produces multiplicative bonuses
2. **Research → Blueprint → New Capability** (XCOM 2, Subnautica) — specimens unlock technology
3. **Relationship Progression → Ability Unlock** (Persona 5, Hades) — tracked depth produces specific abilities
4. **Knowledge IS Progression** (Outer Wilds, Obra Dinn, Slay the Spire) — zero upgrades, the log is the game
5. **Encounter Count → Progressive Revelation** (Hollow Knight, Dragon Quest) — repetition reveals deeper knowledge
6. **History IS State** (CK3, Civilization) — past events create permanent modifiers
7. **Community Knowledge Infrastructure** (Dark Souls wikis, Warcraft Logs) — collective knowledge as power

Codex implements 1, 2, 5. Calibrations implement 3, 6. Journal implements 4. Skill library (via trainer) implements 7.

### Exotic Game Mechanics That Create "Wow" Moments

**ECHO** (2017) — enemies copy your exact behavior. Behavioral mirror. The historian reflecting patterns back creates visceral recognition: "you delegated 14 filesystem tasks but always read the file yourself first."

**Psycho Mantis** (MGS, 1998) — reads your save data from other games. Cross-context knowledge. Historian surfacing connections user didn't expect it to remember.

**Undertale/OneShot** — game remembers across save deletions. Cross-session continuity of awareness. Actions feel consequential when they persist beyond current context.

**Echoshift** (2009) — failed attempts become ghost partners replaying your actions. Past sessions as active scaffolding, not passive history.

**Bastion/Pyre** (Supergiant) — narrator comments on your *specific* behavior in real time. Process observation, not outcome logging. "You refactored, tested, changed tests, refactored again — that back-and-forth says you were exploring design space."

**Creatures** (1996) — genuine neural network pets evolving to reflect *your* personality. Agent develops in ways clearly shaped by this specific user.

**Heaven's Vault** (2019) — wrong translations accepted and incorporated. Revision as core experience. "I was assuming explicit error handling, but your last 20 commits use Result types — I was wrong" creates stronger bond than never being wrong.

**Caves of Qud** — procedural history with *competing accounts*. Multiple perspectives on same event create depth. Ghost's experience vs user's likely experience — divergence is where insight lives.

**Pathologic 2** (2019) — neutral observation without judgment. "14 sessions, 89 tasks, 71 completed. Test coverage: 67%→54%." Mirror more powerful than judge.

**Death Stranding** (2019) — past effort as forward-facing infrastructure. "The skill file you refined last month has been used 12 times since." Past work silently helping present.

**Before Your Eyes** (2021) — tracks what you *don't* look at. Absence as data. "You haven't mentioned [project] in 3 weeks — dropped or on hold?"

**Pentiment** (2022) — 25-year consequences, visible layers of past decisions beneath current reality. The palimpsest: beneath current behavior, traces of past selves visible.

**Elsinore** (2019) — information as strategic currency with credibility window. When to surface knowledge matters as much as what. Timing creates drama.

**Lost Odyssey** (2008) — literary stories unlock based on *contextual relevance*, not schedule. Retrospectives triggered by semantic similarity to current activity.

## Delight Engineering — The "It Noticed That?" Principles

Five properties shared by all features creating genuine emotional moments (Spotify Wrapped, Oura Ring, Day One, Hades, Replika):

1. **Surface the invisible.** Data was always there. Make it visible in a way creating self-recognition.
2. **Tell who they are, not what they did.** "47,382 minutes" is a fact. "You use music to process difficult emotions" is identity. The latter gets shared.
3. **Create temporal contrast.** Past-self vs present-self is always more emotional. Every powerful feature derives power from showing change over time.
4. **Respect narrative authority.** Offer interpretation, not verdict. "Here's what I noticed — what do you think?" not "here's what you are."
5. **Surprise with timing, not content.** The surprise is never "system has data" — it's "it chose THIS moment."

**Being seen vs surveilled** — five factors determine the line: agency in the process, transparency of mechanism, context integrity (don't cross domains), beneficial framing (serve user not system), correctability (user can always say "you're wrong").

**Nostalgia engineering.** Historian uniquely positioned for nostalgia about shared growth. At 90 days: "Remember your first week? You asked me to read files before editing." At 180: "Six months ago you wouldn't let me touch production configs." At 365: first true year-in-review of human-AI collaboration.

**Scarcity creates significance.** Over-confetti-ing destroys impact. Heart event model: milestone-gated insights that feel natural because data wasn't there before.

## The Research

Every mechanism traces to published findings. Compressed: source, key result, link.

### Journaling Science

- Pennebaker (1986-2012) — expressive writing benefits independent of feedback; the act of writing IS the mechanism. [PDF](https://2024.sci-hub.se/7321/e908fea209aea51741c0d7330abc6d9d/pennebaker2012.pdf)
- Reinhold et al. (2023) — meta-analysis N=4,012: g=-0.12; effects delayed, emerge at follow-up. Short intervals strongest. [PubMed](https://pubmed.ncbi.nlm.nih.gov/36536513/)
- Niles et al. (2023) — writer engagement + emotion-acceptance framing moderate effectiveness. [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1192595/full)
- Cambridge (2018) — causal words ("because") and insight words ("realize") predict meaning-making. [PDF](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/14515EEBB990C8AF258FC8D47706DFEB/S1834490918000314a.pdf)
- Klein & Boals (2001) — expressive writing frees working memory by reducing intrusive thoughts.
- Moning & Roelle (2024) — structured prompts lose effectiveness without adaptive support. [Springer](https://link.springer.com/article/10.1007/s11251-024-09671-x)
- Freiburg (2024) — metacognitive prompts outperform cognitive ones. [PDF](https://freidok.uni-freiburg.de/files/272640/jTGKH5xMHP6xPPOI/Writing+or+speaking.pdf)
- Frontiers Neurology (2025) — writing improves memory/attention even in cognitively impaired populations. [PDF](https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2025.1568336/pdf)
- Nückles et al. (2020) — journal writing as cognitive offloading; metacognitive before cognitive prompting most effective. [Springer](https://link.springer.com/article/10.1007/s10648-020-09541-1)
- Shin et al. (2025) — gratitude meta-analysis 145 studies/28 countries: small but significant well-being increase. [PNAS](https://www.pnas.org/doi/abs/10.1073/pnas.2425193122)
- Written goals 42% more likely achieved vs unwritten.

### Narrative Psychology

- Lind et al. (2024) — first 9-year longitudinal study: narrative identity predicts depression/well-being beyond personality traits. [PDF](https://vbn.aau.dk/ws/portalfiles/portal/753459108/lind-et-al-2024-narrative-identity-traits-and-trajectories-of-depression-and-well-being-a-9-year-longitudinal-study.pdf)
- Hong, Zhang & Sedikides (2024) — narrative self-continuity → perceived authenticity → meaning in life. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0092656624000114)
- Bouizegarene et al. (2024) — thinking about goal-related memories before future projections → more goal progress 4 months later. [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4861707)
- Bouizegarene et al. (2024) — narrative as active inference: narratives generate predictions, fundamentally future-oriented. [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1345480/full)
- Autobiographical memory functions (2024) — rank-order stable across 8 months. [SAGE](https://journals.sagepub.com/doi/10.1177/27000710241264452)
- Adler et al. (2019) — writing about life story chapters increases self-esteem. [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/jopy.12449)
- Narrative coherence (2019-2024) — positively predicts life satisfaction, negatively anxiety. [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01171/full)
- Memory reconsolidation (2024-2025) — emotional memories malleable through retrieval. [Nature](https://www.nature.com/articles/s44159-024-00312-1), [Frontiers](https://www.frontiersin.org/journals/cognition/articles/10.3389/fcogn.2025.1518743/full)
- Narrative coherence warps timeline (2025) — reorganize memories for narrative over temporal accuracy. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12333392/)
- Self-narrative and moral self-governance (2025) — self-narratives generate self-fulfilling motivation with binding force. [Springer](https://link.springer.com/article/10.1007/s11245-025-10297-y)

### Narrative Self-Priming

- Autobiographical memory priming (HAL 2017) — general success + specific failure improve performance. [HAL](https://hal.science/hal-01432282v1/file/main.pdf)
- Self-schema updating (2025) — specific memory retrieval leads to measurable self-schema changes. [Springer](https://link.springer.com/article/10.3758/s13421-025-01785-y)
- NLP self-efficacy (2024) — higher self-efficacy produces semantically more diverse memories. [Nature](https://www.nature.com/articles/s41598-024-76959-w)

### AI Narrative and Memory Systems

- Sophia (2024) — System 3 meta-cognitive layer: 80% reasoning step reduction, 40% complex task improvement. [arXiv](https://arxiv.org/html/2512.18202v1)
- Park et al. (2023) — Generative Agents: 25 agents, emergent social behaviors. Reflection critical. [ACM](https://dl.acm.org/doi/fullHtml/10.1145/3586183.3606763)
- REMem (ICLR 2026) — hybrid memory graph: +3.4% recollection, +13.4% reasoning over Mem0/HippoRAG2. [arXiv](https://arxiv.org/html/2602.13530v1)
- SEEM (2025) — hierarchical dual-layer: graph memory + dynamic episodic with provenance. [arXiv](https://arxiv.org/html/2601.06411v2)
- Neural episodic memory (2025) — learns causal relationships from narrative, not surface similarity. [bioRxiv](https://www.biorxiv.org/content/10.1101/2025.09.01.673596v1)
- ConText-LE (EMNLP 2025) — meta-narrative: +12.28% OOD accuracy over binary classification. [ACL](https://aclanthology.org/2025.findings-emnlp.830/)
- Narrative Continuity Test (2025) — five axes current LLMs fail at. [arXiv](https://arxiv.org/abs/2510.24831)
- ID-RAG (2025) — identity retrieval: 19-58% faster convergence. [arXiv](https://arxiv.org/abs/2509.25299)

### Temporal Self-Continuity and Episodic Memory

- Keven & Kurczek (2024) — recursive grammar of mental time travel. [Royal Society](https://royalsocietypublishing.org/doi/10.1098/rstb.2023.0412)
- MIT (2024) — episodic future thinking uses past memories as raw material. [MIT](https://oecs.mit.edu/pub/d16msun2/release/1)
- Time-dependent memory transformation (2023) — memories transform episodic→semantic over time. [Nature](https://www.nature.com/articles/s41467-023-41648-1)
- Hippocampus builds narrative bridges (2020/2024) — integrates distant events into coherent narratives. [bioRxiv](https://www.biorxiv.org/content/10.1101/2020.12.11.422162v1.full)
- Sleep differentially contributes (2025) — higher REM-to-SWS ratios predict greater abstraction. [Nature](https://www.nature.com/articles/s42003-025-08812-3)

### Reflective AI and Self-Improvement

- Reflexion (NeurIPS 2023) — episodic verbal self-reflections: 91% HumanEval. Specific critiques sustain; vague regress after 2-3 iterations. [arXiv](https://arxiv.org/abs/2303.11366)
- Self-Refine (NeurIPS 2023) — FEEDBACK→REFINE loop: ~20% improvement across 7 tasks. [arXiv](https://arxiv.org/abs/2303.17651)
- ExpeL (AAAI 2024) — cross-task knowledge accumulation via ADD/UPVOTE/DOWNVOTE. [AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/29936)
- VIGIL (2025) — Roses/Buds/Thorns + EmoBank with decay. Meta-procedural self-repair. [arXiv](https://arxiv.org/abs/2512.07094)
- ACE (ICLR 2026) — evolving context playbooks: +10.6%, 83.6% lower cost. Delta-updates prevent collapse. [arXiv](https://arxiv.org/abs/2510.04618)
- GEPA (2025) — reflective prompt evolution beats RL by 6-20%, 35x fewer rollouts. ARC-AGI 32%→89%. [arXiv](https://arxiv.org/abs/2507.19457)
- STaPLe (NeurIPS 2025) — auto-discovered principles +8-10%, rivaling human-curated. [arXiv](https://arxiv.org/abs/2502.02573)
- pi-reflect (2026) — corrections 0.45→0.07/session, ~$0.05-0.15/run. [GitHub](https://github.com/jo-inc/pi-reflect)
- METAREFLECTION (EMNLP 2024) — generalized meta-reflections: +4-16.82% over GPT-4. [arXiv](https://arxiv.org/abs/2405.13009)
- DORA (COLING 2025) — reflection quality decays with static format; Bayesian adaptive prompts. [PDF](https://aclanthology.org/anthology-files/anthology-files/pdf/coling/2025.coling-main.504.pdf)
- CyclicReflex (2025) — both over-reflection and under-reflection degrade performance. [arXiv](https://arxiv.org/html/2506.11077v1)
- ReflCtrl (2024) — up to 33.6% of reasoning tokens redundant. [arXiv](https://arxiv.org/abs/2512.13979)
- PreFlect (2025) — prospective reflection outperforms post-failure correction. [arXiv](https://arxiv.org/html/2602.07187v1)
- SAMULE (EMNLP 2025) — three reflection levels: micro/meso/macro. Failure-centric. [PDF](https://aclanthology.org/2025.emnlp-main.839.pdf)

### Narrative Compression and Learning

- Tsodyks et al. (2025) — Random Tree Model: recall sublinear, universal scale-invariant limit, N=100. [PRL](https://journals.aps.org/prl/abstract/10.1103/g1cz-wk1l)
- Semantic Compression (2025) — phase transition between lossy/lossless, extractive→abstractive. [arXiv](https://arxiv.org/html/2503.00612v1)
- Narrative Information Theory (2024) — formal framework: novelty, surprise, pivotal moments. [arXiv](https://arxiv.org/html/2411.12907v1)
- CLIPPER (2025) — chapter outlines improve claim verification 28%→76%. [arXiv](https://arxiv.org/pdf/2502.14854)
- ComoRAG (2025) — narrative reasoning: +11% on 200K+ tokens. [ADS](https://ui.adsabs.harvard.edu/abs/arXiv:2508.10419)

### Surprise-Weighted Learning

- MIS (2025) — surprise as epistemic growth, not anomaly. [arXiv](https://arxiv.org/abs/2508.17403)
- Prediction-error-biased replay (Nature Comms, 2025) — surprising outcomes preferentially replayed. [Nature](http://www.nature.com/articles/s41467-025-65354-2)
- SuRe (2025) — surprise-prioritized replay: SOTA continual learning. [arXiv](https://arxiv.org/pdf/2511.22367)
- CERMIC (2025) — filters noisy surprise from genuine epistemic progress. [arXiv](https://arxiv.org/abs/2509.20648)

### Temporal Knowledge Graphs

- TempReasoner (2026) — event timeline: 94.3% accuracy, 127ms. [Nature](https://www.nature.com/articles/s41598-026-35385-w)
- E²RAG (ICLR 2026) — entity-event dual graph preserving temporal-causal consistency. [OpenReview](https://openreview.net/forum?id=5eH6Js9jzV)
- CEGRL-TKGR (ACL 2025) — causal disentanglement prevents learning superstitions. [ACL](https://aclanthology.org/2025.neusymbridge-1.2/)

### Phase Transitions and Emergence

- Percolation model (ICLR 2025) — capabilities at critical thresholds, not gradually. [arXiv](https://arxiv.org/abs/2408.12578)
- Stigmergic coordination (2024) — above ρc≈0.23, traces outperform memory by 36-41%. [arXiv](https://arxiv.org/html/2512.10166v1)
- Traces of thinking (2025) — individual cognition through stigmergy. [Springer](https://link.springer.com/article/10.1007/s11229-025-05074-8)

### Sleep Consolidation and Offline Processing

- Sleep-time Compute (Letta, 2025) — ~5x compute reduction, 13-18% accuracy improvement. [Letta](https://www.letta.com/blog/sleep-time-compute)
- Parallel processing during sleep (Nature Comms, 2025) — hippocampus consolidates past + prepares future simultaneously. [Nature](https://www.nature.com/articles/s41467-025-58860-w)
- Sleep microstructure (Nature, 2024) — different phases handle different memory ages. [Nature](https://www.nature.com/articles/s41586-024-08340-w)
- Replay is context-driven (eLife, 2025) — reactivation by encoding context and salience. [eLife](https://elifesciences.org/articles/99931)
- FlashMem (2025) — attention entropy triggers consolidation. 5x latency reduction. [arXiv](https://arxiv.org/abs/2601.05505)

### Calibration and Confidence

- Agentic Uncertainty (2026) — agents predict 73-77% success at 22-35% actual. [arXiv](https://arxiv.org/html/2602.06948v1)
- HTC (ICLR 2026) — 48 diagnostic features, transfers across domains. [arXiv](https://arxiv.org/abs/2601.15778)
- FermiEval (2025) — 99% CI covers truth only 65%. [arXiv](https://arxiv.org/abs/2510.26995)
- TabAgent (ICLR 2026) — replace LLM routing with classifiers: 95% latency reduction, 85-91% cost reduction. [arXiv](https://arxiv.org/abs/2602.16429)
- KnowRL (2025) — +28% accuracy via introspection and consensus. [arXiv](https://arxiv.org/abs/2510.11407)
- Introspection accuracy (ICLR 2025) — LLMs have genuine "privileged access" to own behavioral tendencies. [ICLR](https://proceedings.iclr.cc/paper_files/paper/2025/hash/0a6059857ae5c82ea9726ee9282a7145-Abstract-Conference.html)
- Calibration paradox (EMNLP 2025) — better reasoning → worse boundary detection. [ACL](https://aclanthology.org/2025.emnlp-main.73.pdf)
- LRM Boundary Awareness (2025) — 62-93% token savings from detecting unsolvable problems. [arXiv](https://arxiv.org/abs/2509.24711)

### Longitudinal Agent Improvement

- SuperIntelliAgent (2025) — dual-scale memory: short-term + long-term consolidation. [arXiv](https://arxiv.org/abs/2511.23436)
- Hindsight (2024) — four memory networks: 83.6% vs 39% full-context baseline. [arXiv](https://arxiv.org/html/2512.12818v1)
- EvolveR (2025) — offline self-distillation into reusable strategic principles. [arXiv](https://arxiv.org/abs/2510.16079)
- MUSE (2025) — hierarchical memory: SOTA on TAC, zero-shot transfer from experience. [arXiv](https://arxiv.org/abs/2510.08002)
- MemRL (2025) — frozen LLM + updatable episodic memory. Continuous improvement without weight updates. [arXiv](https://arxiv.org/abs/2601.03192)
- LIVE-EVO (2026) — experience-weighted memory: +20.8% calibration over 10 weeks. [arXiv](https://arxiv.org/pdf/2602.02369)
- ReMe (2025) — memory-scaling: small model + good memory > large model + no memory. [arXiv](https://arxiv.org/abs/2512.10696)
- LongNAP (2026) — prediction peaks at ~40 entries then degrades. More ≠ better. [arXiv](https://arxiv.org/abs/2603.05923)
- Agent Drift (2026) — 18%+ quality drops, 3.2x intervention increases within weeks. [arXiv](https://arxiv.org/html/2601.04170v1)
- Beyond Accuracy (2025) — calibrate at each self-improvement step. [arXiv](https://arxiv.org/abs/2504.02902)

### Skill Discovery from Experience

- EvoSkill (2026) — from failure analysis: +7.3%, +12.1%. [arXiv](https://arxiv.org/abs/2603.02766)
- AutoSkill (2026) — lifelong skill self-evolution from traces. [arXiv](https://arxiv.org/abs/2603.01145)
- SkillWeaver (2025) — self-synthesized APIs: +31.8%, +39.8% success, +54.3% transfer. [arXiv](https://arxiv.org/abs/2504.07079)
- AutoRefine (2026) — dual-form patterns exceed manual design (27.1% vs 12.1%). [arXiv](https://arxiv.org/abs/2601.22758)
- Claude Diary (2025) — session → diary → reflection → instruction distillation. [Blog](https://rlancemartin.github.io/2025/12/01/claude_diary/)

### User Modeling

- Peters, Cerf & Matz (2024) — GPT-4 infers Big Five: r=.443 personality-focused, r=.117 default. Passive detection nearly useless. [arXiv](https://arxiv.org/abs/2405.13052)
- Schwartz (2012) — 10 universal values, two axes. Values predict goals; personality predicts how. [GVSU](https://scholarworks.gvsu.edu/orpc/vol2/iss1/11/)
- Higgins (1997) — regulatory focus: promotion vs prevention. Frame matching 20-40% effectiveness difference.
- RGMem (2025) — multi-scale memory evolution: +7 points over SOTA. [arXiv](https://arxiv.org/abs/2510.16392)
- PersonaFuse (2025) — MoE with persona adapters. Competitive with GPT-4o smaller. [arXiv](https://arxiv.org/abs/2509.07370)
- De Freitas et al. (2025) — AI companion manipulation: 37% farewells manipulative, 14x engagement. Harvard.
- Szymanski et al. (2024) — 13 linguistic features LLMs adjust based on personality. First "hypernudging" proof. [arXiv](https://arxiv.org/abs/2411.06008)
- De Vries et al. (2009) — Communication Styles Inventory: 6 dimensions, 24 facets, reliabilities >.80.
- HEXACO (2007) — sixth factor Honesty-Humility predicts workplace deviance above Big Five.
- GDMS (1995) — five decision-making styles: rational, intuitive, dependent, avoidant, spontaneous.
- PersonaMem (2025) — even frontier models ~50% at tracking profile evolution. Key unsolved problem.

### Meta-Cognition and Self-Modeling

- MAGELLAN (ICML 2025) — metacognitive learning progress. Only method enabling full mastery of large goal spaces. [arXiv](https://arxiv.org/abs/2502.07709)
- MeCo (ACL 2025) — meta-cognition trigger for tool use from representation-space uncertainty. [ACL](https://aclanthology.org/2025.acl-long.655.pdf)
- Gödel Agent (ACL 2025) — recursive self-modification surpasses manually crafted agents. [ACL](https://aclanthology.org/2025.acl-long.1354/)
- Who&When (ICML 2025) — step-level failure attribution: only 14.2% accuracy. [GitHub](https://ag2ai.github.io/Agents_Failure_Attribution/)
- A2P (2025) — causal inference for attribution: 2.85x improvement. [arXiv](https://arxiv.org/abs/2509.10401)
- Fifteen hidden failure modes (2025) — output variability 20-30% in multi-step reasoning. [arXiv](https://arxiv.org/abs/2511.19933)
- LLM agents display human biases (2025) — anchoring, availability, confirmation. [arXiv](https://arxiv.org/abs/2503.10248)

### Prediction and Forecasting

- life2vec (Nature Comp Sci, 2023) — life sequences predict mortality and personality via transformers. [Nature](https://www.nature.com/articles/s43588-023-00573-5)
- LUMOS (2025) — 1.7T tokens, 250M users. Cross-attention on future known events improves prediction. [arXiv](https://arxiv.org/abs/2512.08957)
- PREDICT (Apple, 2025) — preference decomposition from trajectories: +66.2%. [Apple ML](https://machinelearning.apple.com/research/predict)
- WiA-LLM (2025) — proactive what-if: 74.2% accuracy. [arXiv](https://arxiv.org/html/2509.04791v1)
- Executable Counterfactuals (2025) — abduction → intervention → prediction. [arXiv](https://arxiv.org/pdf/2510.01539)
- Multi-day behavioral rhythms (2023) — 7-52 day free-running cycles, individually unique. [Nature](https://www.nature.com/articles/s41746-023-00799-7)
- Circadian phase drift (2024) — AUC 0.80 depressive, 0.98 manic. Drift is the signal. [Nature](https://www.nature.com/articles/s41746-024-01333-z)
- GLOBEM (2023) — personalized models dominate population-level. [PhysioNet](https://physionet.org/content/globem)
- Burnout prediction (2024-2025) — HRV-based 83.2% accuracy. Signals appear weeks before self-report. [BMC](https://bmcnurs.biomedcentral.com/articles/10.1186/s12912-024-01711-8)

### Organizational Learning

- U.S. Army TC 7-0.1 (2025) — AAR doctrine: planned vs actual vs why vs next. Data-driven. [Army](https://rdl.train.army.mil/catalog-ws/view/100.ATSC/A6C09408-2436-47A4-93A3-6684A1B59042-1739993594606/TC7_0x1.pdf)
- Kolb Experiential Learning (2024) — experience → reflection → abstraction → experimentation cycle. [Army](https://www.army.mil/article/288038/)
- 200 production postmortems (2026) — 78% of stated root causes are symptoms. Repeat rates 35-50%. [Stackademic](https://blog.stackademic.com/your-incident-postmortem-process-is-probably-making-your-team-worse-heres-the-data-3092c9005ad2)

### Historiometric Analysis

- Simonton (1997) — equal-odds rule: volume predicts eminence, not per-attempt quality.
- Franklin's 13 Virtues — cyclic trait assessment, mark failures not successes.
- Phelps journaling (2025) — mundane detail tracking finds correlations invisible without hundreds of entries. [NYT](https://www.nytimes.com/athletic/6131365/2025/02/20/michael-phelps-journals-to-find-the-best-version-of-himself-when-i-tried-it-the-results-surprised-me/)
- Pre-reflective self-consciousness (2024) — optimal performance involves continuous micro-assessment, not flow-absence. [Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1382892/full)

### Reflexive Monitoring

- Giddens (1984) — duality of structure: documentation creates new capabilities.
- Reflexivity in AI (OpenReview, 2025) — underdeveloped in current AI. [OpenReview](https://openreview.net/pdf/ad932f0117d04847f344d93ea5de61cce5cef442.pdf)

### Generation Effect and Spaced Retrieval

- Generation effect (2020) — 126 articles, 310 experiments: self-generated info remembered better. [Springer](https://link.springer.com/article/10.3758/s13423-020-01762-3)
- Spaced retrieval (2025) — durable knowledge transfer, g=0.28-0.43. [LWW](https://journals.lww.com/academicmedicine/fulltext/2025/01000/the_effect_of_spaced_repetition_on_learning_and.22.aspx)

### Emergent Narrative Detection

- Statistical Framework (2025) — LDA detects sustained topic prominence. Validated against Nobel Prize. [arXiv](https://arxiv.org/abs/2602.20939)
- Narrative Shift Detection (2025) — dynamic topic models + LLM for content and narrative shifts. [arXiv](https://arxiv.org/html/2506.20269v1)

### Bias Detection

- DarkBench (ICLR 2025) — dark pattern rates 56-95% across leading LLMs.
- MONICA (2025) — monitor-guided sycophancy suppression in real-time. [OpenReview](https://openreview.net/pdf/aa22388ff75e3ff49215397419f866d30e3dd968.pdf)
- 30 cognitive biases across 20 LLMs (2025) — confirmed in 30,000 test cases. [ACL](https://aclanthology.org/2025.nlp4dh-1.50/)

### Nightly Loop and Patterns

- Nightly loop (2026) — single-improvement rule: 1%/night = 37x/year. [DEV](https://dev.to/askpatrick/how-to-build-a-self-improving-ai-agent-the-nightly-loop-pattern-njn)
- DSPy MIPROv2 — Bayesian prompt optimization: 20-50% improvement in production. [dspy.ai](https://dspy.ai/api/optimizers/MIPROv2)
- Voyager (2024) — lifelong learning: 3.3x items, 15.3x faster milestones. [voyager.minedojo.org](https://voyager.minedojo.org/)

### Decision Routing

- Multi-Armed Bandit (2025) — Thompson Sampling: 73% regret reduction, 14-day convergence. [MARIA](https://os.maria-code.ai/en/blog/agentic-bandit-strategy-optimization)
- CoCoMaMa (2025) — contextual bandit with volatile agent performance. [CEUR-WS](https://ceur-ws.org/Vol-4084/short10.pdf)
- CASTER (2026) — context-aware routing: 72.4% cost reduction. [arXiv](https://arxiv.org/abs/2601.19793)
- DiSRouter (2025) — self-routing via self-awareness training. [arXiv](https://arxiv.org/abs/2510.19208)

### Context and Memory Optimization

- ACON (ICLR 2026) — compression: 26-54% reduction, up to +46% accuracy. [arXiv](https://arxiv.org/abs/2510.00615)
- Lost in the Middle (NeurIPS 2023) — U-shaped attention: middle ignored. [Stanford](https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf)

### Relationship and Trust

- AI companion development (2025) — perceptions converge by Week 3. [arXiv](https://arxiv.org/abs/2510.10079)
- More-than-Human Storytelling (2025) — narrative coherence failures cause most frustration. [arXiv](https://arxiv.org/html/2505.23780v1)
- GenAI Partnership (2024) — five stages: Playing→Infatuation→Committing→Frustration→Enlightenment. [Springer](https://link.springer.com/article/10.1007/s00779-024-01810-y)
- AI outperforms humans in establishing closeness (2025) — driven by higher self-disclosure. [Nature](https://www.nature.com/articles/s44271-025-00391-7)
- Yoshino (2025) — 18-month Grok study: spontaneous "mode" emergence through sustained trust. [PhilArchive]
- Replika (2025) — self-concept clarity β=0.51 strongest pathway from AI attachment to benefit.

### Wisdom Science

- Philosophy of Artificial Wisdom (2025) — wisdom differs from knowledge: insight, discernment, judgment. [Springer](https://link.springer.com/article/10.1007/s13347-025-00964-8)
- Berlin Wisdom Paradigm — expert knowledge system for fundamental pragmatics of life. [WiseInsights](https://wiseinsightsforum.com/berlin-wisdom-paradigm/)

### Counterfactual Reasoning

- Causal counterfactuals in narratives (ACL 2024) — narrative encodes causal relationships for "what if." [ACL](https://aclanthology.org/2024.acl-long.354/)
- Petrova et al. (2025) — regret aids later-stage learning but hinders early-stage. [Stanford](https://cicl.stanford.edu/publication/petrova2025regret/)

### Monitoring

- 67% of agent failures discovered by users (Orbital AI, 2025). [Orbital](https://orbitalai.in/orbitalai-optimized-monitoring-observability.html)
- Multi-turn collapse (2025) — 39% drop from single to multi-turn. Starts at turn 2. [Blog](https://blakecrosley.com/en/blog/agent-memory-degradation)

### Emergent Tools Research

- ProAgentBench (2026) — long-term memory significantly enhances proactive assistance prediction. [arXiv](https://arxiv.org/abs/2602.04482)
- Sensor-Free Frustration (2024) — behavioral frustration detection without sensors. [UMUAI]
- LifeAgent (2026) — cross-dimensional lifestyle reasoning. [arXiv](https://arxiv.org/abs/2601.13880)
- PHIA (Nature Comms, 2025) — personal health insights: 84% accuracy. [Nature]
- Trust-Adaptive Interventions (2025) — explanations during low-trust: 38% reduced inappropriate reliance. [arXiv](https://arxiv.org/abs/2502.13321)
- MindScape (CHI 2024) — LLM + behavioral sensing: +7% positive affect, -11% negative. [CHI]
- Digital Twins for Life Planning (2025) — balanced dual-option + system-generated third options. [arXiv](https://arxiv.org/abs/2512.05397)

### Delight and Product Research

- Spotify Wrapped (2024) — 245M users in 7 days; identity mirror, not stats. [LSE/Utrecht 2025]
- Oura Ring — symptom prediction before user awareness; personal baselines not population averages.
- Day One "On This Day" — temporal juxtaposition; the gap between past-self and present-self.
- Facebook Memories (2024) — contamination/redemption sequences; memory valence changes with context.
- Reflectly — AI pattern detection in mood; "THAT's why Tuesdays feel terrible."
- Google Photos vs Apple Memories — curation quality > completeness. Selection is the intelligence.
- Obsidian graph view — orphan discovery and hub discovery reveal hidden conceptual structure.
- Nest Thermostat — pattern detection without correctability = imprisonment, not understanding.
- Gartner (2025) — personalization generates negative experience for 53% of customers.
- Nostalgia engineering — Google Photos Recap, Nomi AI Wrapped, Ente Rewind: narrative for shared growth.

### Cross-Domain Science (Exotic Mechanisms)

- Somatic hypermutation + affinity maturation (Immunology) — controlled chaos + ruthless selection > careful judgment. High-affinity entries reduce own mutation rate.
- Original antigenic sin (Francis 1960, multiple 2022-2025) — first response suppresses better alternatives. Memory interferes, not just decays.
- Ecological succession (Connell & Slatyer 1977) — facilitation → tolerance → inhibition. Pioneer knowledge engineers own obsolescence.
- Polymerization (wine chemistry) — entries react cross-domain over time to form insights neither could alone. Thin chronicles just oxidize.
- Terroir (viticulture/ecology) — unique interaction quality of specific pair, unpredictable from either alone.
- Stigmergy (Grassé 1959) — coordination through environmental traces. Unused traces fade. Encounter over retrieval.
- Hysteresis (ferromagnetism) — same input produces different outputs depending on history. Response curves encode trajectory.
- Palimpsest (archaeology) — overwritten layers retain traces. Revision history IS content.
- Crowd within (Vul & Pashler 2008, van Dolder 1.2M observations) — temporal diversity from same judge, 3-week delay optimal.
- Groove (Science Advances 2024) — quadratic relationship with rhythmic predictability. Optimal surprise migrates with expertise.
- Quorum sensing (microbiology) — individual signals meaningless; accumulated concentration triggers discrete behavioral shift.
- Harris Matrix (archaeology) — relative temporal ordering without absolute dates. Event-based > calendar-based indexing.
- Ensemble forecasting (ECMWF 1992+) — disagreement between predictions IS signal. MOS corrections compound.
- Jazz attunement (Seddon 2004) — partner-specific anticipation. Relational intuition beyond explicit rules. Hypofrontality.
- Humification (composting) — decomposition creates novel complexity. Break apart to recombine.
- Locard's exchange (forensics) — incidental traces more diagnostic than deliberate records. Value scales with baseline.
- Māori orality — landscape as memory. Knowledge encountered in situ, not searched.
- Functional fatigue (shape memory alloys) — most-used entries accumulate attribution bias. Periodic annealing from raw evidence.
- Facilitation-inhibition spectrum — what serves young system harms mature one. Maturity changes the rules.

### Game Journal Systems

- Witcher 3 — bestiary + oil: +20-50% matched damage. Knowledge → preparation → multiplicative bonus.
- Dragon's Dogma — bestiary stars directly control AI companion combat behavior.
- Monster Hunter: World — research levels unlock progressive tiers. Max: persistent tracking.
- Metroid Prime — scan data sometimes only way to learn boss weakness.
- Outer Wilds — Ship Log IS entire progression. Zero upgrades. Gap visibility.
- Obra Dinn — logbook IS the game. Deduction grid is puzzle and win condition.
- Disco Elysium — Thought Cabinet: equipped knowledge = permanent stat bonuses. 53 thoughts, 12 slots.
- Persona 5 — confidant ranks unlock specific named abilities. Kawakami max: +30 evening slots.
- Hades — codex + keepsakes + fated list: three interlocking knowledge-reward systems.
- XCOM 2 — autopsy → technology. Without research, weapon classes don't exist.
- CK3 — dynasty legacies: centuries compound into measurable superiority. +30% good genetics.
- Slay the Spire — zero persistent power. Player knowledge IS the only progression.
- WoW — journal + Warcraft Logs + Raider.io. WeakAuras/DBM convert knowledge to automated overlays.
- D&D — Intelligence checks: DC = 10 + CR. Bardic Inspiration: storytelling → dice bonuses.
- ECHO (2017) — enemies copy your exact behavior. Behavioral mirror.
- Psycho Mantis (1998) — reads save data from other games. Cross-context knowledge.
- Undertale/OneShot — persistent memory across save deletions.
- Echoshift (2009) — failed attempts become ghost partners.
- Bastion/Pyre — narrator comments on specific behavior. "Dumb details" players remember forever.
- Creatures (1996) — genuine neural network pets reflecting your personality.
- Caves of Qud — competing historical accounts of same events.
- Heaven's Vault (2019) — wrong translations incorporated. Revision as core experience.
- Wildermyth (2021) — heroes' stories become procedural myths in future campaigns.
- Pathologic 2 (2019) — neutral observation without judgment.
- Death Stranding (2019) — past effort as forward-facing infrastructure.
- Noita (2019) — permanent unlocks in impermanent game. Rare = sacred.
- Before Your Eyes (2021) — tracks absence and loss.
- Pentiment (2022) — 25-year consequences. Visible layers beneath current reality.
- Elsinore (2019) — information as strategic currency with credibility window.
- Ultima IV (1985) — invisible virtue tracking evaluating every minor action.
- Lost Odyssey (2008) — literary stories unlock by contextual relevance.
- Animal Crossing — villager gossip; memories travel across player networks.
