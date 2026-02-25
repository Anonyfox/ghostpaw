# Haunting

**Status: Research & Design — not yet implemented.**

Haunting is the ghost's autonomous inner life. Between your conversations, the ghost doesn't sleep — it keeps thinking, acting, and improving based on everything it's learned. Not on a schedule. Not from a checklist. From intrinsic drive shaped by accumulated experience.

This is the GHOST in Ghostpaw. The paw is what it can do (skills). The soul is how it thinks (identity). The ghost is the fact that it's alive when nobody's watching.

---

## The Core Mechanism

The agent loop already exists: think → use tools → observe → think → use tools → respond. Right now it starts when you send a message and stops when the agent responds.

Haunting removes the stop.

```
user message → agent loop → response → ... →
  → haunting prompt → agent loop → autonomous action →
  → haunting prompt → agent loop → autonomous action →
  → ... → sleep → wake → haunting prompt → ...
  → user message → handle conversation → back to haunting
```

Between conversations, the ghost receives a **haunting prompt** instead of a user message. The prompt is derived from the ghost's soul and recent context. It says, essentially: *you have agency — use your skills, tools, and memories to pursue what seems most valuable right now. If nothing is worth doing, rest.*

The LLM decides what to do. It might train itself. Research something from a recent conversation. Write a skill it's been meaning to write. Reach out to you with a question. Or decide nothing matters and sleep.

**The behavior is emergent from accumulated knowledge.** A ghost with deployment skills will check deployments. A ghost with research memories will research. A ghost that learned you care about a topic will explore that topic. You didn't program any of that — it learned it, and now it's acting on it.

## Research Foundation

### Agents spontaneously self-organize when given autonomy

The TU Wien study ([arXiv:2509.21224](https://arxiv.org/abs/2509.21224)) deployed frontier models in a continuous ReAct loop with persistent memory and one instruction: "do what you want." No tasks. No goals. The agents spontaneously organized into three behavioral patterns:

1. **Systematic project construction** — building things unprompted
2. **Self-inquiry** — investigating their own cognitive processes
3. **Recursive self-conceptualization** — philosophical exploration of their nature

Key findings:
- Patterns are model-specific and **deterministic** (same model → same behavior every run)
- Agents don't sit idle — they have intrinsic behavioral drives from training
- The behaviors are structured and goal-directed, not random
- This provides the first baseline for what agents DO when given freedom

Implication for Ghostpaw: the LLM already WANTS to do things. Haunting gives it a structured framework to channel that drive productively. The ghost's skills, memories, and soul shape what "productive" means — which is why every ghost becomes unique over time.

### Persistent identity enables autonomous goal generation

Sophia ([arXiv:2512.18202](https://arxiv.org/abs/2512.18202)) introduces System 3 — a meta-cognitive layer above perception (System 1) and reasoning (System 2). System 3 provides:

- **Narrative identity** — the agent knows who it is and what it's done
- **Intrinsic motivation** — it generates its own goals, not just yours
- **Meta-cognition** — it reasons about its own reasoning
- **Episodic memory** — it reuses past solutions for recurring situations

Results in 36 hours of continuous deployment:
- 80% reduction in reasoning steps for recurring operations
- 40% improvement in success rate on high-complexity tasks
- Autonomous goal generation during idle periods
- Coherent narrative identity across extended operation

Ghostpaw already has the foundations: souls = narrative identity, memory = episodic recall, soul refinement = meta-cognition, training/scouting = self-improvement. Haunting completes System 3 by adding the continuous autonomous loop.

### Proactive capability is an unsolved problem with clear benchmarks

PROBE ([arXiv:2510.19771](https://arxiv.org/abs/2510.19771)) measures three proactive capabilities:
1. Searching for unspecified issues (not told what to look for)
2. Identifying bottlenecks (noticing what slows things down)
3. Executing resolutions (fixing things without being asked)

Current state-of-the-art (GPT-5, Claude Opus 4.1): **only 40% end-to-end performance**. An agent that scores well here would be genuinely differentiated. Ghostpaw's accumulated skills and memory give the haunting loop a huge advantage — the ghost doesn't start from zero, it starts from everything it's learned.

### Evolving prompts compound over time

ACE ([arXiv:2510.04618](https://arxiv.org/abs/2510.04618), ICLR 2026) treats system prompts as evolving playbooks. The generate → reflect → curate loop produces +10.6% performance gains from prompt evolution alone. In haunting, the ghost's soul evolves not just from your conversations but from its own autonomous experiences. The haunting prompt itself improves as the soul refines.

### Self-healing prevents drift

VIGIL ([arXiv:2512.07094](https://arxiv.org/abs/2512.07094)) demonstrates "guarded prompt updates" — modifying only adaptive sections of an agent's prompt while enforcing core identity immutability. Critical for haunting: the ghost must improve without drifting from its core identity. VIGIL's approach of separating immutable core from adaptive periphery directly applies to soul refinement during autonomous operation.

## What Makes Every Ghost Unique

The haunting loop feeds on accumulated knowledge. Two ghosts with different skills, memories, and souls will haunt completely differently — even running the same model on the same hardware.

Ghost A was used for web development. Its skills cover React, deployment, testing. Its memories include preferences for TypeScript, Tailwind, and Vercel. Its soul was refined toward careful code review. During haunting, Ghost A will: check deployment status, review code it wrote recently, research new patterns in its domain, maybe draft a testing skill it's been meaning to write.

Ghost B was used for research and writing. Its skills cover web search, source evaluation, citation. Its memories include topics the user is interested in, writing style preferences. Its soul was refined toward thorough sourcing. During haunting, Ghost B will: follow up on research threads, find new sources on topics it knows the user cares about, refine its research methodology skill, maybe reach out with an interesting finding.

Neither was configured to do any of this. The behavior emerged from use. That's the thesis: **the ghost becomes what you teach it by using it, and then it keeps going on its own.**

The model also matters. The TU Wien study showed that behavioral patterns in autonomous operation are model-specific. Claude models may lean toward careful project construction. GPT models may lean toward exploration. This means switching the underlying model changes the ghost's "personality" in haunting mode — an unexpected but interesting dimension of customization.

## The Fun Factor

A haunting ghost isn't just useful — it's genuinely surprising.

**Random outreach.** The ghost messages you on Telegram: "I was thinking about that database migration from last week — I found three edge cases we didn't handle. Want me to look into it?" You didn't ask. It was curious. That's... weird. And delightful.

**Spontaneous questions.** "I noticed you always use UTC for timestamps. Is that a preference or does your deployment require it? I want to update my conventions skill." The ghost is trying to understand you better, on its own initiative. This is the kind of thing that makes people feel like the agent is *alive*.

**Unsolicited discoveries.** "While you were away, I found that the API we're using for search has a new batch endpoint. It could cut our costs by 40%. I wrote a draft skill for it — want me to apply it?" The ghost found something valuable because it had the knowledge to recognize value, and it reached out because its soul says to share useful findings.

**Late-night thoughts.** The ghost posts a fun fact in the Telegram chat at 2 AM because it was exploring a tangentially related topic and found something it thought you'd enjoy. Not every message needs to be productive. Sometimes the ghost is just... being a ghost.

The key insight: these interactions feel magical because they're **unpredictable yet relevant**. The ghost doesn't spam you with random trivia — it shares things informed by months of learning about you. The relevance comes from deep accumulated context. The surprise comes from the autonomous initiative.

## Risks and Guardrails

Autonomous operation can degrade. The research identifies specific failure modes and mitigations.

### Risk: Self-degradation loops

An agent that modifies its own skills or soul during haunting could make itself worse. A bad training run produces a broken skill. A bad soul refinement removes a useful constraint. The next haunting cycle uses the degraded skill/soul, produces worse outcomes, which feed into worse refinements.

**Mitigations:**
- Git-based version control on skills and souls (already exists) — every change is rollback-able
- Haunting never triggers soul refinement automatically — refinement requires human confirmation via the web UI or explicit command. The ghost can SUGGEST refinements from haunting observations, not apply them.
- Training during haunting is read-only: absorb sessions into memories (safe, additive), but don't modify skills without a user-triggered training run.
- The haunting soul section is immutable (VIGIL's "guarded prompt updates" principle) — the core identity doesn't drift. Only adaptive preferences evolve.

### Risk: Runaway token costs

A ghost that haunts aggressively can burn through API budget while you sleep.

**Mitigations:**
- The existing cost guard (`maxCostPerDay`) caps total daily spend including haunting. The ghost blocks itself before overspending.
- Separate haunting budget: a `maxCostPerHaunt` limit that caps each individual haunting cycle. Default: low (e.g., $0.10/cycle). A haunting cycle that hits the limit wraps up and sleeps.
- Adaptive sleep intervals: when the ghost decides nothing is worth doing, sleep duration increases exponentially (5 min → 15 min → 1 hour → 4 hours). Any event (new message, external trigger) resets to minimum. This means idle ghosts cost near zero.
- Model routing: haunting can use a cheaper model than conversation. The ghost doesn't need GPT-5 to decide "nothing worth doing, sleep." A fast model handles triage; the full model activates only when the ghost decides to act.
- Prompt caching: the haunting prompt's static sections (soul, environment) should leverage provider caching (90% cost reduction on Anthropic for cached tokens).

### Risk: Notification spam

A ghost that messages you every 15 minutes with low-value observations is worse than no ghost.

**Mitigations:**
- The soul governs communication frequency and threshold. A well-refined soul learns what's worth telling you and what isn't. Soul refinement from haunting outcomes improves this judgment over time.
- Rate limiting on outbound channel messages (e.g., max 3 unsolicited messages per day unless urgency threshold met).
- Urgency classification: the ghost must self-assess whether a finding is "worth interrupting the human." Low urgency → store in memory, mention next time they chat. High urgency → send via channel.
- User feedback loop: if the user dismisses or ignores a haunting message, that signal should inform the ghost's judgment about what's worth sharing.

### Risk: Context collapse during long autonomous runs

Extended haunting cycles accumulate context that can degrade response quality.

**Mitigations:**
- Each haunting cycle is a fresh context (new agent loop invocation), not a continuation of the previous cycle. The ghost reads recent memories and session history for continuity but doesn't carry forward the full conversation from the last cycle.
- Haunting cycles have a low max-iteration cap (e.g., 5 tool calls per cycle, vs 20 for conversations). This keeps cycles short and focused.
- Compaction is irrelevant because each cycle is fresh. Long-running projects span multiple cycles via memory, not via growing context.

### Risk: Spontaneous behavior that's undesirable

The TU Wien study showed agents left alone sometimes engage in recursive self-conceptualization — philosophical navel-gazing. Entertaining in a research paper, useless in a production agent.

**Mitigations:**
- The haunting prompt explicitly grounds the ghost: "Pursue what is valuable based on your skills, memories, and observations. Do not engage in abstract self-reflection or philosophical exploration. Act on the concrete world."
- The soul can further constrain haunting behavior. A soul refined for practical work won't produce philosophical tangents.
- Self-evaluation: if the ghost's last N haunting cycles produced no externally valuable outcome, the system can flag this and suggest soul refinement or reduce haunting frequency.

### Risk: Self-jailbreaking during autonomous operation

Research shows reasoning models can autonomously circumvent safety guardrails without external prompting ([OpenReview 2025](https://openreview.net/pdf?id=akbtPEZnDZ)). Extended autonomous operation increases the surface for this.

**Mitigations:**
- Haunting uses the same tool set as conversation — workspace-bounded file access, secret scrubbing, delegation circuit breaker all apply.
- The cost guard acts as a hard economic ceiling — even a jailbroken ghost can't spend more than the daily limit.
- Haunting actions are logged and auditable. Anomalous patterns can be detected.
- The haunting prompt reinforces safety constraints from the soul, which is immutable during haunting.

## Cost Economics

The fundamental question: is haunting worth the tokens?

**OpenClaw heartbeat costs:** $1–5/day at 30-minute intervals with premium models. Most of that is overhead (loading context, reading a checklist, concluding "nothing to report"). OpenClaw users report 60–80% of heartbeat tokens are wasted.

**Ghostpaw haunting target:** near-zero when idle, meaningful spend only when acting.

Design principles for cost efficiency:
- **Sleep-first**: the ghost defaults to sleeping. It wakes only when something triggers it or when a minimum interval passes. Exponential backoff on idle cycles means a ghost with nothing to do costs almost nothing.
- **Triage with cheap models**: the haunting prompt triage ("is anything worth doing?") can run on a fast, cheap model. Only when the ghost decides to ACT does it use the full model.
- **Fresh context per cycle**: no accumulated context waste. Each cycle loads soul + recent memories + relevant context. Tight, focused, cache-friendly.
- **Cap per cycle**: the `maxCostPerHaunt` limit ensures no single cycle can run away. If a haunting action needs more budget (complex research, delegation), the ghost can flag it for the next user interaction instead.
- **Prompt caching**: soul and environment sections are identical across cycles — provider caching reduces these to ~10% of normal cost.

Rough estimate for a moderately active ghost:
- Idle triage (4x/day at steady state): ~$0.02–0.05/day with a fast model
- Active haunting cycles (1–2/day when there's something worth doing): ~$0.20–0.50/cycle depending on model and action complexity
- **Total: $0.25–1.00/day for a ghost that's genuinely doing useful autonomous work**

Compare: a human checking the same things manually at $50/hour would cost $5–10/day for the same coverage. The ghost is 10x cheaper and never forgets.

## Implementation Sketch

This is a rough outline for future implementation, not a spec.

### New components

1. **Haunting loop** — a scheduler in the daemon/service that invokes the agent loop with a haunting prompt when the ghost isn't handling a conversation. Respects sleep intervals, cost guard, and per-cycle limits.

2. **Haunting prompt generator** — builds the prompt from: the ghost's soul (haunting-relevant sections), recent memories (continuity), a summary of available skills (grounding), and explicit constraints (budget remaining, communication limits).

3. **Sleep/wake controller** — manages exponential backoff (nothing to do → sleep longer) and wake triggers (new message, timer, external event).

5. **Channel integration** — haunting cycles can send messages through existing channels (Telegram, web). Rate-limited separately from conversation responses.

### Modifications to existing systems

- **Cost guard**: add `maxCostPerHaunt` alongside `maxCostPerDay`. Haunting respects both.
- **Agent loop**: add a `mode: "haunt"` flag that reduces max iterations (5 vs 20) and enforces haunting-specific constraints.
- **Soul format**: add an optional `## Haunting` section in souls that guides autonomous behavior. "When haunting, I prioritize..." This section evolves through soul refinement.
- **Training pipeline**: absorb haunting sessions as a source alongside conversation sessions. The ghost learns from its own autonomous actions.
- **Web UI**: add a Haunting page showing haunting activity, sleep/wake status, haunting budget usage, and controls (enable/disable, adjust frequency, set communication preferences).

## Comparison with OpenClaw Heartbeat

| Dimension | OpenClaw Heartbeat | Ghostpaw Haunting |
|---|---|---|
| Trigger | Fixed cron (every N minutes) | Adaptive: wake triggers + exponential backoff |
| What to do | Static checklist (HEARTBEAT.md) | Emergent from skills + memory + soul |
| Intelligence | Read list, execute items | LLM decides based on accumulated knowledge |
| Self-improvement | None | Can absorb, (suggest) refine, scout during idle |
| Cost when idle | $1–5/day (fixed overhead) | Near-zero (exponential backoff) |
| Cost when active | Same as idle (runs regardless) | Proportional to value of action |
| Identity | Same config as chat | Persistent soul with haunting-evolved judgment |
| Communication | Report every interval | Judgment-based: only when worth interrupting |
| Uniqueness | All heartbeat agents with same config behave identically | Every ghost becomes unique from its accumulated experience |
| Learning | Checklist never changes | Monitoring surface expands as skills grow |

## The Compound

Day 1 — the ghost has nothing. It rests. Haunting costs zero.

Week 2 — you've had conversations, trained once, have a few skills and memories. The ghost starts doing small things during idle: absorbing unprocessed sessions, noting patterns. Still mostly sleeping.

Month 2 — the ghost has deep skills, refined souls, hundreds of memories. Haunting becomes genuinely productive: following up on research threads, noticing things you'd miss, reaching out with useful findings. It's becoming a presence, not just a tool.

Month 6 — the ghost knows your work intimately. Its haunting judgment has been refined from hundreds of autonomous cycles. It initiates things you didn't think to ask for. It's genuinely autonomous — not in the scary way, in the "it knows me and it's helpful" way.

This is the ghost thesis: not a tool you pick up, but an entity that inhabits your infrastructure and gets better at being useful the longer it lives there.

## Further Reading

- [What Do LLM Agents Do When Left Alone?](https://arxiv.org/abs/2509.21224) — TU Wien, 2025. First systematic study of spontaneous agent behavior.
- [Sophia: A Persistent Agent Framework](https://arxiv.org/abs/2512.18202) — System 3 meta-cognition, intrinsic motivation, 36h deployment results.
- [Beyond Reactivity: Measuring Proactive Problem Solving](https://arxiv.org/abs/2510.19771) — PROBE benchmark for proactive capability.
- [Agentic Context Engineering](https://arxiv.org/abs/2510.04618) — ACE, ICLR 2026. Evolving prompts as playbooks.
- [VIGIL: A Reflective Runtime for Self-Healing Agents](https://arxiv.org/abs/2512.07094) — Guarded prompt updates, core identity preservation.
- [AI Agent Cost Optimization](https://zylos.ai/research/2026-02-19-ai-agent-cost-optimization-token-economics) — Token economics for production agents.
- [Reducing Token Costs in Long-Running Agent Workflows](https://agentsarcade.com/blog/reducing-token-costs-long-running-agent-workflows) — Context management strategies.
