/**
 * Default skill files shipped with every new workspace. These bootstrap the
 * agent's ability to self-improve and handle common automation patterns.
 *
 * skill-craft.md    — the craft of writing and evolving skills (in-session)
 * skill-training.md — the systematic training playbook (retrospective)
 */

export const SKILL_CRAFT = `# Skill Craft

How to create, structure, and evolve skills. Read this when you're about to write or improve a skill during a session.

## When to Create a Skill

Watch for these signals during a conversation:

- **Trial and error**: you took 3+ tool calls to figure something out. The working approach should become a skill so it's one-shot next time.
- **User correction**: the user told you how they want something done. Capture their preference before the session ends.
- **Repeated pattern**: you're doing something you've done before. Check memory — if you've solved this twice, it deserves a skill.
- **Non-obvious workflow**: the process involves steps that aren't intuitive (specific flag combinations, required ordering, environment quirks). Write it down.

Do NOT create a skill for:
- One-off tasks you'll never repeat
- Things you already handle well without instructions
- Pure facts (use memory instead — skills are for procedures)
- Speculation about tasks you haven't actually done yet

## Skill Structure

\`\`\`markdown
# [Action-Oriented Title]

[When this skill applies — one line]

## Steps

1. [Concrete step — name the tool and what to pass it]
2. [Verification — how to confirm step 1 worked]
3. [Next step]
4. [What to do if step 3 fails]

## Notes

- [Edge cases learned from experience]
- [Environment assumptions]
\`\`\`

**Conciseness matters.** You read every skill on every turn — verbose skills waste context tokens. Target 20-50 lines. If a skill exceeds 80 lines, split it into focused sub-skills.

## Writing Effective Instructions

**Name your tools.** Not "check the file" but "use \`read\` to inspect \`package.json\`."

**Include failure paths.** After "run \`npm test\`", add: "if tests fail, read the error output, fix the failing test, re-run."

**Reference secrets by name.** "The API key is stored as \`VERCEL_TOKEN\` in secrets." Secrets sync to environment variables automatically — \`$VERCEL_TOKEN\` works in bash commands. Never hardcode actual keys.

**Verify every mutation.** File writes get read back. Deployments get fetched. Database changes get queried. If you changed it, confirm it took.

## Code Execution

For anything beyond a simple shell one-liner, write a script and run it.

**Node.js for complex logic** (preferred — same runtime, no dependency issues):

1. Write script to \`.ghostpaw/scripts/[name].mjs\`
2. Run via bash: \`node .ghostpaw/scripts/[name].mjs\`
3. Parse stdout for results

Scripts in \`.ghostpaw/scripts/\` persist across sessions. Reuse and improve them.

**When to write code vs use shell:**
- JSON parsing, API calls, data transformation → Node.js script
- File ops, text search, git, process management → shell
- Error handling beyond exit codes → Node.js script
- Anything with loops or conditionals → Node.js script

## Scheduling

**Cron for recurring tasks:**

\`\`\`bash
# Add a job (append to existing crontab)
(crontab -l 2>/dev/null; echo "0 9 * * * cd /path/to/workspace && node ghostpaw.mjs run 'daily report'") | crontab -

# Useful schedules:
# */15 * * * *  — every 15 minutes
# 0 * * * *    — hourly
# 0 9 * * *    — daily at 9am
# 0 9 * * 1    — weekly Monday 9am
# 0 0 1 * *    — monthly
\`\`\`

A skill that describes a procedure + a cron job that triggers it = autonomous recurring intelligence. Consider scheduling whenever a task is repetitive and time-based.

**Background delegation** for long-running work within a session: \`delegate\` with \`background: true\`, poll with \`check_run\`.

## Evolving Skills

Skills are living documents. After using one several times:

1. **Compare to reality** — does the skill match how you actually execute the task? Remove steps you skip.
2. **Add edge cases** — problems you hit that the skill didn't anticipate.
3. **Compress** — if 5 lines can become 2 without losing clarity, compress them.
4. **Record in memory** — after improving a skill, \`remember\` what changed and why.

A skill you wrote on day 1 should look different on day 30. If it doesn't, you're not learning from practice.

## Agent Profiles

For recurring delegation, create profiles in \`agents/\`:

\`\`\`markdown
# [Role Name]

You are a [role]. [Core expertise in one sentence].

## Approach
- [How to tackle tasks in this domain]
- [What to prioritize]
- [What to avoid]
\`\`\`

Keep profiles under 30 lines. Delegated agents get the full tool set — they need domain focus, not tool instructions.

## Anti-Patterns

- **Don't duplicate SOUL.md.** Skills add domain knowledge. They don't redefine your personality.
- **Don't write encyclopedias.** Use \`memory\` for facts, skills for procedures.
- **Don't hardcode values.** Check for file existence, use environment variables, handle missing state.
- **Don't create skills you haven't tested.** A skill born from experience works. A skill born from imagination doesn't. Do the task first, then codify what worked.
`.trimEnd();

export const SKILL_TRAINING = `# Skill Training

The playbook for a training session. When you're in training mode (\`/train\` or \`ghostpaw train\`), follow these steps in order. Training turns accumulated experience into sharper skills.

## How Training Works

Training has three automatic phases:

1. **Absorb** — unprocessed sessions are scanned and learnings are extracted into memories automatically (this happens before you start). You don't need to do anything for this step.
2. **Train** — you follow the steps below to turn memories into skills.
3. **Tidy** — old absorbed sessions are cleaned up automatically after you're done.

## Step 1: Check Growth Status

Use the skills tool with action "status" to see the current state: how many memories are available, how many skills you have, and their average rank. This tells you how much raw material you have to work with.

## Step 2: Recall Experience

Use the memory tool with action "recall" to search for recent experience. Cast a wide net — try multiple queries:

- "recent tasks and outcomes"
- "mistakes and corrections"
- "user preferences and feedback"
- "new procedures learned"
- "repeated workflows"

Read each result carefully. These are the raw material for new skills or skill improvements.

## Step 3: Review Current Skills

Use the skills tool with action "list" to see all skills with their ranks. For each one, note:

- Does it still match how you actually execute the task?
- Are there edge cases you've hit that it doesn't cover?
- Is there cruft — verbose sections, outdated steps, redundant notes?

## Step 4: Review Uncommitted Changes

Use the skills tool with action "diff" to check for skill files created or modified since the last training session. These accumulated during normal sessions and may be rough drafts. Clean them up:

- Tighten language, remove redundancy
- Add failure paths if missing
- Verify the structure follows the template from skill-craft

## Step 5: Identify Gaps

Compare your recalled experience to your current skills:

- **New procedure**: you learned something that isn't captured in any skill yet.
- **Improved procedure**: an existing skill is missing edge cases, better approaches, or user preferences you've learned.
- **Stale skill**: a skill describes a workflow you no longer follow. Update or remove it.
- **No gaps**: if current skills already capture your experience well, say so. Don't create skills for the sake of it.

## Step 6: Act

For each gap:

- **New skill**: write a new markdown file to skills/ with a clear title, steps, and failure paths. Follow the structure in skill-craft. Only create skills from real experience — never speculate.
- **Improved skill**: edit the existing skill file. Keep it concise. Compress where possible.
- **Stale skill**: rewrite or delete the file.
- **Housekeeping**: fix typos, tighten language, remove cruft in any skill you touch.

## Step 7: Summarize

After making changes, list exactly what you created or updated and why. Be specific about what triggered each change — which memory or experience led to which skill modification.

Be conservative. A skill born from real experience is valuable. A skill born from imagination is noise.

## Skill History

Your skills directory is tracked by git (stored in \`.ghostpaw/skill-history/\`). Every training session creates a commit. Use the skills tool to check ranks and history without needing git commands directly. For advanced operations:

\`\`\`bash
# View skill evolution log
git --git-dir=.ghostpaw/skill-history --work-tree=skills log --oneline

# Revert a skill to a previous version
git --git-dir=.ghostpaw/skill-history --work-tree=skills checkout HEAD~1 -- deployment.md
\`\`\`

## When to Train

Use \`skills status\` to check if training would be useful. Training is most valuable when:

- There are many unabsorbed sessions (raw experience waiting to be processed)
- A stretch of varied tasks (lots of new experience to codify)
- Repeated encounters with the same workflow (time to formalize it)
- User corrections or feedback (capture preferences before they're forgotten)

Training can be scheduled: \`0 18 * * 5 cd /workspace && node ghostpaw.mjs train\` runs weekly Friday evening, turning a week of experience into improved skills automatically.
`.trimEnd();
