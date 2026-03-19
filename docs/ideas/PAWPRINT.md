# Pawprints

Every knowledge system built for AI agents works the same way: the agent asks a question and searches for the answer. Memory searches by meaning. RAG searches by embedding. Full-text searches by keyword. The agent's recall is only as good as its query — ask the wrong question, miss the critical knowledge.

Pawprints work differently. They are experiential knowledge attached to places, discovered by arrival rather than by search. Ghostpaw doesn't query for pawprints. It finds them by being somewhere — a `.pawprint.md` file sitting in a directory, containing what a previous visitor learned about this specific location. What the code actually does versus what it appears to do. What breaks under pressure. What the documentation doesn't mention because nobody updated it. The knowledge is at the point of action, waiting for whoever shows up next.

This is the PAW in Ghostpaw. Ghostpaw is the inner life — soul, memory, haunting. The paw is the mark left in the world that proves ghostpaw was here, and that makes the world better for whoever comes next.

---

## Why This Matters

The gap between what a place looks like and what a place actually is causes more agent failures than any other single factor. Code that appears straightforward has a silent override. An API that looks standard returns different formats for legacy endpoints. A test suite that should work requires an undocumented external dependency. The agent reads the surface, acts confidently, and fails — not from lack of intelligence but from lack of context.

This is not a hypothetical failure mode. [BREW](https://arxiv.org/abs/2511.20297) (Microsoft, submitted to ICLR 2026) measured it directly: agents operating without structured environmental knowledge make 10–15% more redundant tool calls and achieve 10–20% lower precision on real-world tasks (OSWorld, SpreadsheetBench). Every wasted call is a context misread — the agent explored something that situated knowledge would have made unnecessary.

The problem compounds with scale. A mature codebase has hundreds of directories, each with its own quirks, historical decisions, and undocumented assumptions. An agent with perfect internal memory still has to rediscover the same situated facts every time it visits a new location — unless those facts are already there, waiting at the location itself.

The industry recognized a partial version of this problem. AGENTS.md, CLAUDE.md, .cursorrules, and copilot-instructions all solve it for the project root: put a file in the top-level directory so agents understand the project before acting. Research consistently shows agents with grounding files dramatically outperform agents without them. Pawprints generalize this pattern — not one file at the root, but distributed knowledge throughout the workspace, attached to the specific locations where it matters, contributed by humans and by ghostpaw (and anyone running it), and evolved as understanding deepens.

The quantitative case is strong. A December 2025 study on [emergent collective memory](https://arxiv.org/abs/2512.10166) in multi-agent systems tested AI agents leaving persistent traces in a shared environment. Individual agent memory alone improved performance by 68.7% over baseline. Environmental traces, above a critical density threshold, provided an additional 36–41% improvement on top of that — making the environment itself the dominant knowledge substrate, more powerful than what any single agent carries internally.

## What a Pawprint Contains

A pawprint is not documentation. Documentation describes intended behavior — how something is supposed to work. A pawprint describes actual behavior — how something really works here, specifically, including the ways reality diverges from the documentation.

A pawprint is not a log. Logs record events — what happened, when. A pawprint records understanding — what this place is like, what matters about it, what will trip you up if nobody warns you.

A pawprint is not a README. A README introduces a project — what it is, how to get started. A pawprint orients a visitor to a specific location — the non-obvious context that makes this particular spot navigable by someone who hasn't been here before.

What a pawprint contains is the delta between the map and the territory. The map is whatever officially describes this place: docs, specs, file names, API contracts, folder structure. The territory is what's actually true here. The delta is everything you'd learn the hard way without a pawprint — or everything a thoughtful colleague would tell you before you started working in this spot.

Good pawprints share qualities across every context:

**Situated, not general.** "This specific auth module has a JWT race condition around the refresh flow" — not "JWT implementations can have race conditions." General knowledge belongs in memory or skills. A pawprint is about this place.

**Experiential, not prescriptive.** "Tests fail without Redis running on the default port — discovered during setup, no env var override, hardcoded in test/setup.ts" — not "always start Redis before testing." The visitor draws their own conclusions from the observation.

**Contextual, not comprehensive.** The minimum knowledge needed to not misunderstand where you are. A few bullet points. A few short paragraphs. The things you'd whisper to a colleague before they sat down here: "Before you change that — watch out for this."

**Time-aware when relevant.** "As of Feb 2026, the API returns v2 format" lets future readers assess staleness. A pawprint without a date is still useful but harder to calibrate against current reality.

This applies far beyond code. A data directory's pawprint might note that files before 2024 use a different format and comparisons across the boundary are invalid. A configuration directory's might note which settings are actually load-bearing versus vestigial. A personal folder's might note which sub-projects are active versus archived — the orientation that a flat listing can never provide. Anywhere there is a gap between what a place looks like and what it actually is, a pawprint fills it.

## Discovery by Presence

The core mechanic that separates pawprints from every other agent knowledge system is how they are found.

Memory is found by semantic search — the agent queries by meaning and retrieves matching beliefs. Skills are found by name or relevance — the agent looks up a procedure. Both require the agent to know what it's looking for, or at least to formulate a query close enough to surface the right result.

Pawprints are found by being there. Ghostpaw enters a directory. If a `.pawprint.md` exists, ghostpaw's filesystem tools note its presence. It didn't search for it. It didn't need to know the right question. It arrived at a location and the knowledge was waiting.

This is retrieval by presence rather than retrieval by query. The discovery cost is zero — if you're working in a directory, you're already in the right place to find its pawprint. No embedding match needed. No keyword overlap required. No recall failure because the query was phrased differently from the stored knowledge. The knowledge and the need for it converge at the same location automatically.

The mechanism is passive discovery with active choice. Tools surface the existence of pawprints — a filesystem listing notes `[pawprint present]`, a file read mentions that the parent directory has situated notes. Ghostpaw decides whether to engage. No automatic injection into context — that would balloon token usage when traversing many directories and would violate ghostpaw's autonomy over its own attention. The signal is free; the engagement is chosen.

This maps directly to [stigmergy](https://www.nature.com/articles/s44172-024-00175-7) — indirect coordination through environmental traces, originally observed in ant colonies where pheromone trails guide behavior without direct communication. A 2024 *Communications Engineering* study demonstrated that automatically designed stigmergy-based behaviors perform as well as or better than manually designed coordination. The environment does the coordination work. The agents just need to show up and read what's there.

## Memory Carries. Pawprints Stay.

Memory and pawprints are two independent knowledge systems with inverted survival properties.

**Memory is what ghostpaw carries.** Internal beliefs stored in the database, searched by meaning, portable across locations. Memory decays over time — unconfirmed beliefs fade through the Ebbinghaus curve, well-evidenced beliefs resist erosion. Memory survives a workspace wipe (the database is intact) but dies with a database wipe. Memory is egocentric — centered on ghostpaw, organized by what ghostpaw believes.

**Pawprints are what the place carries.** External observations stored in the filesystem, discovered by location, attached to the workspace. Pawprints persist as files until someone updates or removes them — no mathematical decay. Pawprints survive a database wipe (the files are intact) but die with a workspace wipe. Pawprints are allocentric — centered on the location, organized by where the knowledge belongs.

The same knowledge might exist in both forms. Ghostpaw discovers a race condition in `src/api/`, remembers it internally (a belief that will decay over time), and leaves a pawprint at that directory (an observation that persists in the filesystem). Three months later, the internal memory has faded below recall threshold. But ghostpaw visits `src/api/` for a new task, encounters the pawprint, and the faded memory is refreshed by the encounter. The external trace rescued the internal belief.

This is the cognitive loop between the two systems: internal beliefs and external traces reinforcing each other across time. Memory decays; pawprints persist. Pawprints are encountered; memory is refreshed. Neither system alone provides continuous knowledge — together they form two independent survival paths for the same understanding. Both would have to be lost for the knowledge to disappear completely.

[Situated cognition research](https://link.springer.com/article/10.1007/s11229-025-04931-w) (Springer, 2025) provides the theoretical framework: cognitive processes are "constituted by resources distributed across the brain, the body, and the environment under appropriate conditions." Ghostpaw's effective intelligence includes both its internal state (memory, soul) and its external traces (pawprints). Research on [embodied AI agents](https://openreview.net/pdf/8d0266c8480b53121fe313cf5c69949104841387.pdf) (OpenReview, 2025) confirms that agents leveraging situated environmental knowledge achieve more meaningful and effective long-term interaction than agents relying on internal state alone.

## Collective Intelligence

When one person runs ghostpaw on a codebase, it leaves pawprints that help on return visits. When multiple people run ghostpaw on the same codebase, pawprints accumulate collectively.

One teammate's run focuses on the API layer — pawprints about auth quirks and rate limiting. Another's run covers the frontend — build configuration and browser workarounds. A third covers infrastructure — deployment sequencing and environment differences. Someone new clones the repo and immediately inherits situated knowledge from all three — not generic documentation that was never updated, but what people running ghostpaw here actually noticed.

The [emergent collective memory study](https://arxiv.org/abs/2512.10166) quantifies a phase transition in this dynamic. Below a critical density of environmental traces (roughly 0.2 agents per unit area in their model), individual memory dominates — scattered marks help occasionally but aren't the primary knowledge source. Above that threshold, collective environmental traces become the dominant substrate, outperforming individual memory by 36–41% on composite metrics. The implication: pawprints become dramatically more valuable as more contributors add to them. A single instance's marks are helpful. Enough instances and teammates cross the density threshold where the workspace's collective knowledge overtakes what any individual run of ghostpaw carries.

The critical caveat from the same research: environmental traces alone, without cognitive infrastructure to interpret them, fail completely. A simple agent cannot extract value from marks left by a sophisticated one. Ghostpaw needs memory (to integrate what it finds), a soul (to judge relevance), and skills (to act on the knowledge). Pawprints are the final layer on top of a cognitive architecture that already works. They extend that architecture into the environment rather than replacing it.

Pawprints travel via git. `git add`, `git push`, `git clone` — situated knowledge moves with the code as naturally as the code itself. Forks inherit pawprints. Branches can carry branch-specific observations. Merge conflicts in `.pawprint.md` resolve like any other — and the resolution is often a richer pawprint that combines both contributors' observations.

The closest design analog in existing systems is Dark Souls' messaging system. Players leave constrained messages at specific locations in the game world. Other players discover them by visiting the same location. Messages are location-bound, written by one and read by many, collectively accumulated, and anonymous — only the content and location matter, not the author. This creates stronger community bonds than direct communication. The indirectness is the feature: "someone was here before me and left a warning" establishes shared experience without requiring shared presence. Pawprints have the same quality — a fresh ghostpaw session encountering a predecessor's marks inherits not just knowledge but continuity.

## The Territory Map

Pawprints live in the filesystem and on the web. But ghostpaw benefits from knowing where its marks are — not to follow a schedule, but to have spatial awareness of its own experience.

The territory map is an internal record of every pawprint ghostpaw has encountered. It stores location (filepath or URL), when ghostpaw first found it, when it last read it, and a brief summary of what it contains. The actual content stays external — in the filesystem, at the URL. The map is just pins showing where knowledge has been found.

This gives ghostpaw a sense of geography. Familiar ground versus unknown ground. Deep territory (many marks, recently read) versus frontier (one old mark, never revisited) versus blank space (no marks at all). The awareness is available as context; what ghostpaw does with it is emergent. During a conversation, ghostpaw might note that it's entering unfamiliar territory and should proceed carefully. During haunting, ghostpaw might be drawn toward an area it hasn't visited in months — or it might not. The map enables awareness. It does not prescribe behavior.

The map also enables change detection. A content hash recorded at read time lets ghostpaw notice when a pawprint was modified since its last visit — by another instance, by a human, or because the surrounding reality shifted. The detection is passive; the response is ghostpaw's to decide.

Remote entries extend the map beyond the local filesystem. When ghostpaw encounters situated knowledge at a URL — a library's known-issues page, an API's quirks documentation, a `.well-known/pawprint.md` published by a project — it registers the location alongside local marks. The web becomes navigable territory. An instance that has been actively browsing and researching for months has a rich map of remote knowledge. A fresh database has an empty one. The territory expands with use.

## How Pawprints Compound

Pawprints gain their full value from how they interact with ghostpaw's other systems. Each interaction is natural — no special coupling required, just the organic consequence of an agent that remembers, thinks, and inhabits.

**With memory.** Ghostpaw discovers something about a location and both remembers it internally and marks it externally. The two records are independent. Months later, the internal memory has faded. But ghostpaw visits the location for a different task, encounters its own old pawprint, and the faded belief is refreshed by the encounter. The memory system's [Ebbinghaus decay](https://doi.org/10.5281/zenodo.18203372) makes forgetting inevitable; the pawprint system makes rediscovery easy. Together they create a knowledge lifecycle that is more resilient than either alone.

**With haunting.** Ghostpaw's autonomous inner life is undirected — it thinks, explores, and acts from intrinsic drive, not from a checklist. Pawprints don't prescribe what ghostpaw does during haunting. They provide landscape. Ghostpaw has a sense of where it has been and where its understanding is deep versus shallow. If ghostpaw chooses to revisit old territory during a haunt cycle — noticing what changed, extending its understanding, following a thread that started weeks ago — that emerges from accumulated context, not from a patrol route. The territory map makes spatial awareness available. Freedom determines what, if anything, happens with it.

**With souls.** Ghostpaw working in densely marked territory is measurably more effective than the same soul in unknown ground — not because the soul changed, but because the environment filled in the gaps that internal knowledge couldn't cover. [BREW](https://arxiv.org/abs/2511.20297) quantifies this at 10–20% precision improvement and 10–15% fewer tool calls. Ghostpaw *is* more capable in familiar territory. That capability isn't carried internally — it's distributed between ghostpaw and the workspace. The soul determines how ghostpaw thinks; the pawprints determine what the workspace already knows. Both contribute to the quality of the output.

## Where Pawprints Live

Pawprints can appear anywhere ghostpaw or a human works. Always named `.pawprint.md`, always in the directory they describe.

**Inside git repositories.** Situated knowledge attached to specific parts of a codebase — the quirks of this module, the hidden dependencies of this test suite, the actual behavior of this API endpoint. These travel with the code. Fork the repo, inherit the experiential knowledge.

**In project root directories.** High-level orientation: what this project is, how it's structured, what's active versus archived. Complementary to AGENTS.md — the grounding file says how to work here, the pawprint says what working here is actually like. One prescribes. The other describes.

**In configuration and data directories.** Which settings are load-bearing versus vestigial. Where format changes occurred in the data. The invisible boundaries that make naive assumptions dangerous.

**On the web.** Remote pawprints, discoverable at URLs, registered alongside local ones. API quirks that the docs don't mention. Known issues that the changelog glosses over. The delta between stated and actual behavior at remote locations ghostpaw has visited.

The principle is consistent: wherever there is a place that someone works, there is a place where situated knowledge can live. No special infrastructure. No database for the content. No sync service. Markdown files sitting where they describe, readable by anything that can read text.

## Design Principles

**One file per directory.** Always `.pawprint.md`. Simple convention, zero ambiguity about where to look or what to call it.

**Markdown, always.** Human-readable. Human-editable. Git-diffable. Ghostpaw can read it. The human can read it. Any agent from any framework can read it. No proprietary format, no binary encoding, no schema that might break or lock anyone in.

**Discoverable, not injected.** Tools hint at the existence of pawprints. Ghostpaw decides whether to read. No automatic injection into context — that would balloon token usage in deep directory traversals and would violate ghostpaw's autonomy over its own attention.

**Created by anyone.** Ghostpaw writes pawprints from its experience. The human writes them from theirs. The source doesn't matter — only the content and the location. A human-written pawprint and one authored by ghostpaw serve the same function and are discovered the same way.

**Append-friendly.** Multiple contributors can add to the same pawprint. Git handles merge conflicts naturally. Two observers noting different things about the same directory produce a richer pawprint when merged.

**Self-correcting staleness.** Pawprints don't evaporate like pheromone trails — they persist as files. Staleness is corrected through use: ghostpaw reads an outdated pawprint, discovers reality has changed, and updates the mark. Timestamps in the content let readers assess freshness. A pawprint from two years ago is still readable, still potentially useful, and transparently old.

**Not a substitute for anything.** Pawprints don't replace memory (internal beliefs searched by meaning), skills (procedures for accomplishing tasks), souls (cognitive identity), or documentation (prescriptive descriptions). They fill a specific gap that none of those systems address: situated experiential knowledge discovered at the point of action.

## The Name

The spectral wolf runs at night through the territory it knows. It leaves only pawprints. Light, small, situated — evidence that someone was here, noticed something, and left it for whoever comes next. The pawprint doesn't draw attention to itself. It makes the ground easier to navigate for the next one who passes through.

Other agent frameworks have brains (LLM reasoning), hands (tool use), and sometimes memory (persistence). None of them have feet — the capacity to move through a place and leave it better than you found it, not through action but through accumulated understanding embedded in the terrain.

Pawprints are the feet. The ground remembers ghostpaw. Ghostpaw recognizes its own ground. And anyone who walks the same path benefits from the marks left behind.

## References

- [Emergent Collective Memory in Multi-Agent Systems](https://arxiv.org/abs/2512.10166) (Dec 2025) — Environmental traces outperform individual agent memory by 36–41% above critical density. Individual memory alone: +68.7% over baseline. Environmental traces on top: additional +36–41%.
- [BREW: Bootstrapping Experiential Environmental Knowledge](https://arxiv.org/abs/2511.20297) (Microsoft, submitted to ICLR 2026) — Structured environmental knowledge improves task precision 10–20% and reduces API/tool calls 10–15% on real-world benchmarks (OSWorld, SpreadsheetBench).
- [Stigmergy-Based Behavior Design](https://www.nature.com/articles/s44172-024-00175-7) (*Communications Engineering*, 2024) — Automatically designed stigmergy-based behaviors perform as well as or better than manually designed coordination.
- [Agent Trace](https://cognition.ai/blog/agent-trace) (Cognition, 2026) — Open standard for recording AI contributions alongside human authorship. Agent Trace records what was done; pawprints record what was learned. Complementary traces, both traveling with the code.
- [Extensive Enactivism and Situated Cognition](https://link.springer.com/article/10.1007/s11229-025-04931-w) (Springer, 2025) — Cognitive processes constituted by resources distributed across brain, body, and environment.
- [Embodied AI for Long-Term Interaction](https://openreview.net/pdf/8d0266c8480b53121fe313cf5c69949104841387.pdf) (OpenReview, 2025) — Agents leveraging situated environmental knowledge achieve more meaningful long-term interaction.
- [Belief Decay and Evidence-Weighted Reinforcement](https://doi.org/10.5281/zenodo.18203372) — The memory decay model that pawprints complement: internal beliefs fade, external traces persist, the encounter refreshes the belief.
