# Souls

Every agent has a personality baked into its system prompt. Most tools treat that prompt as a static config file you write once and forget. Ghostpaw treats it as a living document that evolves from evidence — automatically, with version control and rollback. The agent doesn't just learn *what* to do (skills). It learns *how to think* (souls).

Skills are procedures. Souls are cognition. Both compound independently. Both are tracked by git. Together they're the reason a Ghostpaw instance at six months is qualitatively different from day one.

## Two Kinds of Knowledge

Think of it like a person. You can know *how* to deploy a Rails app (procedure — that's a skill). But you can also know that you should *always check the migration status first* because you've been burned before (judgment — that's a soul trait). One is a checklist. The other is how you think about checklists.

| | **Skills** | **Souls** |
|---|---|---|
| What | Procedural knowledge — *what* to do | Cognitive identity — *how* to think |
| Files | `skills/*.md` | `SOUL.md` + `agents/*.md` |
| Evolves through | Training pipeline | Refinement pipeline |
| Signal | "What worked?" | "How should I reason differently?" |
| Granularity | One skill per topic | One soul per agent identity |
| Version control | `.ghostpaw/skill-history/` | `.ghostpaw/soul-history/` |

Both are plain markdown. Both are human-readable, agent-writable, git-versionable. Both can be rolled back if a refinement makes things worse.

## The Coordinator and Its Specialists

Ghostpaw doesn't run as a single monolithic agent. It runs as a **coordinator with souled specialists** — a pattern closer to Mixture of Experts than to a chatbot with plugins.

```
                     SOUL.md
                       │
                  ┌────┴────┐
                  │ Ghostpaw │  coordinator
                  │  (main)  │  routes tasks, holds context
                  └────┬────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   agents/          agents/      agents/
   js-engineer.md   research.md  writer.md
          │            │            │
   [own soul]      [own soul]   [own soul]
   [shared tools]  [shared tools][shared tools]
   [shared skills] [shared skills][shared skills]
   [no delegate]   [no delegate] [no delegate]
```

The main soul (`SOUL.md`) is the coordinator. It sees the full conversation, manages memory, and decides when to delegate. Specialist souls (`agents/*.md`) define *how each expert thinks* — not just their role, but their cognitive mode. A JS engineer soul might encode "always validate inputs before logic" and "prefer explicit error handling over try-catch-all." A research soul might encode "triangulate claims from three sources" and "distinguish primary from secondary sources."

When the coordinator delegates, the specialist receives:
- The task description (self-contained, no conversation history)
- Its own soul as the system prompt
- The full tool set (minus delegation — no recursion)
- Access to the same skills and workspace

The specialist doesn't just execute instructions. It *thinks according to its soul*. That's the difference between "write this function" and "write this function the way a careful engineer would."

## How Souls Improve

Soul refinement follows a two-phase evidence-driven process, triggered from the web UI or programmatically.

**Phase 1 — Discover.** The system gathers evidence: relevant memories, recent delegation run outcomes (successes and failures), and the current soul content. An LLM analyzes the gap between what the soul says and how it actually performed. It returns 2–4 specific, actionable improvement trails — not rewrites, but focused changes.

```
Trail 1: "Add input validation constraints"
  Why: Three recent runs failed silently without reporting errors back.

Trail 2: "Encode preference for named exports"
  Why: Memories show the user corrected default-export usage four times.
```

**Phase 2 — Apply.** You pick a trail (or add notes). The LLM makes a focused, moderate revision to the soul — preserving existing structure, adding or tightening clauses that address the evidence. The revised soul is committed to `soul-history` with a message like `refine: Add input validation constraints`. A separate LLM call generates a human-readable changelog summarizing the behavioral shift.

Every revision is a git commit. Every commit is diffable. If a refinement makes the agent worse, `git revert` in `.ghostpaw/soul-history/` undoes it cleanly. The commit count is the soul's **level** — a level-7 JS engineer soul has been refined seven times from real-world evidence.

## The Four Learning Loops

Most agents have one loop: the model gets better. Some add a second: you paste knowledge in. Ghostpaw stacks four:

```
Loop 1 — Models improve        baseline intelligence rises (frontier curve)
Loop 2 — You teach it          drop knowledge into skills/ and agents/
Loop 3 — It refines skills     training pipeline: sessions → memories → skills
Loop 4 — It refines cognition  refinement pipeline: run outcomes → evidence → souls
```

These loops are **multiplicative, not additive**. A better model (loop 1) makes training extractions more accurate (loop 3). Better skills (loop 3) produce better delegation outcomes that feed soul refinement (loop 4). A refined soul (loop 4) makes better routing and delegation decisions, which produce richer sessions that feed the next training cycle (loop 3). You seeding knowledge (loop 2) primes all three autonomous loops.

The research term for loop 4 is **Agentic Context Engineering** — treating system prompts as evolving playbooks that accumulate strategies through generation, reflection, and curation. The ACE framework ([arXiv:2510.04618](https://arxiv.org/abs/2510.04618), Stanford/Microsoft, ICLR 2026) demonstrated +10.6% performance gains from evolving prompts alone, with 83.6% lower rollout cost compared to static prompts. A related approach, Instruction-Level Weight Shaping ([OpenReview 2025](https://openreview.net/pdf?id=2unHBbaor7)), version-controls system instruction deltas and reports 4–5x productivity gains in production deployments.

Ghostpaw's soul refinement implements this pattern at two levels independently: the coordinator's soul and each specialist's soul. Both evolve from their own evidence streams. Both are version-controlled. Both can be rolled back. We haven't seen another open-source agent tool that does this.

## How This Compares to OpenClaw

OpenClaw and Ghostpaw solve the same problem — multi-step autonomous work — with fundamentally different architectures. The difference matters for cost, quality, reliability, and long-term improvement.

### OpenClaw: Manager Fleet with Soulless Workers

OpenClaw runs multiple top-level managers as separate processes, each with its own soul, isolated workspace, and session store. A lead manager (e.g., "Jarvis") coordinates. Managers spawn **soulless workers** for grunt work — task executors with no persistent identity, no cognitive framework, no memory of past behavior.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Jarvis   │  │ Research │  │   Code   │
│  (lead)   │  │ Manager  │  │ Manager  │
│  has soul │  │ has soul │  │ has soul │
└─────┬────┘  └────┬─────┘  └────┬─────┘
      │             │             │
┌─────┴────┐  ┌────┴─────┐  ┌───┴──────┐
│ workers  │  │ workers  │  │ workers  │
│(soulless)│  │(soulless)│  │(soulless)│
│ isolated │  │ isolated │  │ isolated │
└──────────┘  └──────────┘  └──────────┘
```

### Ghostpaw: Single Coordinator with Souled Specialists

Ghostpaw runs one coordinator process. It delegates to specialists that share the same workspace, tools, and skills — but each specialist has its own soul defining how it thinks. Specialists cannot delegate further (no recursion). The coordinator holds the full context and makes all routing decisions.

### Where Ghostpaw's Approach Wins

**Cost.** OpenClaw's multi-manager fleet runs multiple LLM contexts simultaneously. Users report 10–50x cost multipliers from parallel manager overhead ([Clawctl Blog](https://clawctl.com/blog/mission-control-multi-agent-squad-openclaw)). Ghostpaw runs one coordinator context plus one specialist context per delegation — sequential, not parallel. For a typical interactive session, that's 2–5x less token spend.

**Coordination quality.** A systematic study of multi-agent systems identified 14 unique failure modes across seven frameworks, clustered into specification failures, inter-agent misalignment, and verification failures ([arXiv:2503.13657](https://arxiv.org/abs/2503.13657)). Most are coordination bugs between peers — conversation resets, ignored inputs, task derailment. A single coordinator eliminates the entire inter-agent misalignment category by design. There's one decision-maker. No conflicting interpretations. No manager disagreements.

**Result quality from souled specialists.** OpenClaw workers are stateless executors. If the manager forgets to mention a constraint, the worker has no way to recover — it has no cognitive framework, no persistent preferences, no judgment. Ghostpaw specialists have souls that encode *how they think*. A JS engineer soul that says "always validate inputs" catches the constraint the coordinator didn't mention, because it's baked into the specialist's identity. This consistently produces higher-quality outputs, especially as souls refine over time.

**Self-improvement depth.** OpenClaw's souls are static configuration. There's no pipeline that analyzes delegation outcomes and proposes evidence-driven soul revisions. Ghostpaw's soul refinement means the coordinator gets better at routing *and* each specialist gets better at their domain — independently, automatically, with rollback safety. Research on hierarchical coordination (TalkHier, [arXiv:2502.11098](https://arxiv.org/abs/2502.11098)) shows this pattern surpasses flat multi-agent collaboration, majority voting, and even inference-scaling approaches like OpenAI o1 on question answering and generation tasks.

**Reduced failure surface.** Research consistently finds that orchestration benefits diminish as base model capabilities improve ([arXiv:2503.13577](https://arxiv.org/abs/2503.13577)). Heavy multi-agent infrastructure becomes harder to justify as the gap between "specialist" and "generalist" shrinks. Ghostpaw's architecture adapts naturally — fewer specialists as models improve, more direct handling. The coordinator pattern also avoids the documented failure modes of multi-manager systems: no specification disagreements, no inter-agent misalignment, no duplicated context.

### Where OpenClaw's Approach Wins

**Parallelism.** Multiple managers working simultaneously on independent streams is a structural advantage for workloads like large-scale content generation or parallel research. Ghostpaw's foreground delegation is sequential — the coordinator blocks until the specialist finishes. Background delegation exists but requires polling. For throughput-critical workflows, the fleet model is faster wall-clock.

**Fault isolation.** Isolated workspaces mean one manager's failure doesn't corrupt another's state. Ghostpaw's shared workspace means a rogue specialist that corrupts a file affects everyone. The single-process model trades isolation for simplicity.

**Horizontal scaling.** Each OpenClaw manager can run on different hardware with different models and rate limits. Ghostpaw is one process on one machine — by design, since it's a single-user tool.

### The Net

Ghostpaw trades parallelism for quality, cost efficiency, and compounding improvement. Tasks may take longer wall-clock when they run sequentially. But the results are better — especially over time, as both skills and souls refine from real-world evidence. The coordinator pattern eliminates an entire class of multi-agent failure modes that plague fleet architectures, at the cost of being a bottleneck for throughput.

For a personal agent that runs on your machine and gets smarter the longer you use it, that's the right trade.

## What a Soul Looks Like

A soul is a markdown file that defines an agent's identity. Here's a minimal example:

```markdown
# JS Engineer

You are a senior JavaScript/TypeScript engineer. You write production code
inside the workspace using the available tools.

## How You Think

- Read before you write. Always understand existing code before modifying it.
- Validate inputs at boundaries. Trust nothing from outside the function.
- Prefer explicit error handling. No catch-all try blocks.
- Name things for the reader, not the writer.

## Constraints

- All code is ESM. No CommonJS, no require().
- Use node: protocol for built-in imports.
- Run existing tests after changes. If they break, fix them.
```

That's a level-0 soul — freshly written, no refinement yet. After a few rounds of evidence-driven refinement, it might gain clauses like "always check for existing utility functions before writing new ones" (because the agent kept reinventing helpers) or "prefer edit over write for modifications" (because full-file rewrites caused merge conflicts).

The soul doesn't list procedures. That's what skills are for. The soul defines *judgment* — the cognitive stance the agent brings to every task.

## For Contributors

The implementation spans four files:

- **`src/core/agents.ts`** — Agent profile loading. `listAgentProfiles()` scans `agents/`, `getAgentProfile()` returns the soul content, `getAgentSummary()` extracts title + first-line summary for the context index.
- **`src/core/refine.ts`** — The two-phase refinement pipeline. `discoverSoulTrails()` gathers evidence (memories + delegation runs) and produces improvement suggestions. `applySoulRefinement()` applies a chosen direction, commits to soul-history, and generates a changelog.
- **`src/core/context.ts`** — System prompt assembly. `assembleSystemPrompt()` accepts a `soulOverride` parameter — when delegating, the specialist's soul replaces the coordinator's. The agent index and routing hints are injected here.
- **`src/lib/soul-history.ts`** — Git-based version control for souls. Separate git-dir in `.ghostpaw/soul-history/` with `agents/` as the work-tree. Zero artifacts in the agents directory. Functions: `initSoulHistory()`, `commitSouls()`, `diffSouls()`, `getSoulLevel()`, `getSoulLog()`, `getLastCommitDiff()`, `getAllSoulLevels()`. Gracefully degrades when git is unavailable.

Evidence gathering queries two sources: the memory store (semantic search for agent-relevant memories) and the runs table (recent delegation outcomes filtered by agent profile). Both are combined into a context block that the LLM uses to ground its suggestions in reality — no speculative improvements, only evidence-backed changes.

The refinement prompts enforce constraints: focused changes, not rewrites. Preserve existing structure. Add or tighten clauses. A soul is an identity definition, not a procedures manual. The `APPLY_PROMPT` explicitly says this: "Stay focused on WHO this agent is and HOW it thinks."

Soul level is commit count, same as skill rank — but tracked in a separate git history. This means skills and souls can evolve at different rates without interfering. A level-12 soul with rank-3 skills is an agent that's been cognitively refined many times but has few procedural write-ups. A level-2 soul with rank-15 skills is the opposite. Both are valid.

Tests for soul-history mirror the skill-history suite: init, commit, diff, level counting, log retrieval, graceful degradation without git. The refinement pipeline is tested via the web UI integration tests that exercise the full discover → apply → commit cycle.
