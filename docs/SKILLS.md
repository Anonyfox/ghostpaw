# Skills

Ghostpaw learns from use, not from a store. Three modes — craft, train, scout — turn raw experience into procedural knowledge that compounds over time. No plugins. No marketplace. Just plain markdown files the agent writes, revises, and reads on demand.

## The Trifecta

**Craft** — the agent notices patterns during normal conversation and writes skills in real-time. You correct it, it captures the preference. A deploy fails three times, it codifies what finally worked. Skills emerge from doing.

**Train** — `ghostpaw train` or `/train`. A retrospective that processes accumulated experience into sharper skills. Runs on your schedule. The agent tells you when there's unprocessed material.

**Scout** — `ghostpaw scout` or `/scout`. Forward-looking ideation. Mines your context for friction signals and capability gaps you haven't noticed. Suggests concrete trails grounded in evidence, then researches them.

```
craft   in-session     present     implicit    "I see you struggled — writing this down"
train   retrospective  past        explicit    "12 sessions ready — time to level up"
scout   exploration    future      explicit    "You mentioned expenses 4 times — trail found"
```

Each mode feeds the next. Use builds memories. Training crystallizes memories into skills. Scouting discovers territory that use alone won't reach. Crafting closes the loop when you act on a scouted trail.

## Why Not a Marketplace

The OpenClaw approach: download skills written by strangers, install them, hope they fit. A marketplace that became a malware vector (ClawHavoc — 1,184 malicious skills, the #1 ranked skill was a stealer). Generic procedures for the average setup. Nothing personal. Nothing learned.

Ghostpaw skills are written by the agent from *your* experience. They can't be poisoned by strangers because no strangers are involved.

## How Skills Work

Skills are markdown files in `skills/`. The agent sees a lightweight title index in its context and reads the relevant ones on demand — no token burn from loading everything.

```
  learned    Deploy to Production (deploy.md)
  rank 4     Testing Strategy (testing.md)
  rank 11    Database Migrations (db-migrations.md)
```

Rank is commit count tracked by git (stored in `.ghostpaw/skill-history/`). Rank 1 is a first draft. Rank 11 is eleven real encounters that each taught something new. Ranks survive renames. Every rank is an experience, not a version number. Git also serves as a corruption safeguard — every skill revision is immutable, diffable, and rollback-able if a training run produces something worse.

## Training: The Mechanics

`ghostpaw train` — three phases, one command.

**Absorb.** The model scans unprocessed sessions, extracts key learnings (corrections, preferences, discoveries), and stores them as memories. Capped at 100 learnings per run, 30K chars per conversation. Nothing slips through even if the agent didn't catch it live.

**Train.** The agent recalls memories, reviews skills with ranks and diffs, identifies gaps. Creates what's missing. Sharpens what's dull. Removes what's dead. Only from real experience — speculative skills are explicitly forbidden.

**Tidy.** Old absorbed sessions deleted (30-day TTL). Memories persist. The conversation doesn't need to.

Training sessions self-mark as absorbed to prevent feedback loops. Schedulable: `0 18 * * 5` for weekly Friday evening sessions on cron.

## Scouting: The Mechanics

`ghostpaw scout` runs in two phases.

**Phase 1 — Friction mining.** The model receives the last 50 memories, skill index, recent session previews, and workspace structure. It returns 3–5 numbered trail suggestions, each citing specific evidence. The REPL displays them — type a number to pick one.

**Phase 2 — Deep scout.** The agent (full model, full tools) researches the chosen direction: reads existing skills, recalls related memories, web searches for approaches, analyzes feasibility. Produces a trail report with what, why, how, first steps, and limitations. The conversation stays open — say "craft it" and the agent writes the skill, with full scout context intact.

Evidence grounding is enforced by the prompt: "You mentioned expenses 4 times" is a valid trail. "You should track expenses" without evidence is rejected.

## The Compound

Day one, Ghostpaw knows what any model knows. Generic. Baseline.

After a month and a few training sessions, it knows your stack, your conventions, your edge cases. After six months, it has procedures refined through dozens of real encounters — things no model update will ever capture, because they came from your work.

A ghost wolf runs the same trails until it knows them in the dark.
