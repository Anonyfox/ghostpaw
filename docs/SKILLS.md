# Skills

A ghost wolf doesn't learn from a manual. It learns from the hunt.

## The Marketplace Is a Dead End

The OpenClaw approach: download skills written by strangers, install them, hope they fit. A skill marketplace that became a malware marketplace (ClawHavoc — 1,184 malicious skills, the #1 ranked skill was a stealer). Thousands of generic procedures for the average setup. Nothing personal. Nothing learned. Nothing retained.

This is buying someone else's muscle memory. It doesn't work.

## Skills Are Scars, Not Downloads

Ghostpaw skills are plain markdown files in `skills/`. The agent sees a lightweight index of what's available, then reads the ones relevant to the current task on demand. No token burn. No runtime. No plugin system. No store.

The difference: **the agent writes them itself, from experience.**

You correct the agent — it remembers. A deploy fails in a specific way — it remembers. You prefer tabs, hate semicolons, always want tests before commits — it remembers. These memories accumulate silently. Then you train, and the memories crystallize into skills.

```
  learned    Deploy to Production (deploy.md)
  rank 4     Testing Strategy (testing.md)
  rank 11    Database Migrations (db-migrations.md)
```

Rank 1 is a first sighting. Rank 11 is eleven encounters that each taught something new. Every rank is a real experience, tracked by git, surviving renames.

## Training

`ghostpaw train` — three phases, one command.

**Absorb.** Unprocessed conversations are scanned. Key learnings extracted. Stored as memories. Nothing slips through even if the agent didn't catch it in the moment.

**Train.** The agent reviews memories against current skills. Creates what's missing. Sharpens what's dull. Removes what's dead. Only from real experience — never hallucinated procedure.

**Tidy.** Old session data cleaned up. Memories stay. The conversation doesn't need to.

You decide when to train. After a rough week. After a new project. Friday evenings on cron. The agent tells you when it has unprocessed sessions worth training on.

## The Compound

Day one, Ghostpaw knows what any model knows. Generic. Baseline.

After a month of use and a few training sessions, it knows your stack, your conventions, your edge cases. After six months, it has procedures refined through dozens of real encounters — things no model update and no marketplace skill will ever capture, because they came from *your* work.

OpenClaw gives you someone else's notes. Ghostpaw gives you your own instincts, written down.

A ghost wolf runs the same trails until it knows them in the dark.
