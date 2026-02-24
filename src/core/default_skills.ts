/**
 * Default skill files shipped with every new workspace. These bootstrap the
 * agent's ability to self-improve and handle common automation patterns.
 *
 * skill-craft.md    — the craft of writing and evolving skills (in-session)
 * skill-training.md — the systematic training playbook (retrospective)
 * skill-scout.md    — the scouting playbook for creative ideation
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
- Tasks where the default behavior already works correctly without domain-specific instructions
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

**Conciseness matters.** You see the skill index in your context and read relevant ones on demand — shorter skills are faster to process and act on. Target 20-50 lines. If a skill exceeds 80 lines, split it into focused sub-skills.

## Writing Effective Instructions

**Name your tools.** Not "check the file" but "use \`read\` to inspect \`package.json\`."

**Include failure paths.** After "run \`npm test\`", add: "if tests fail, read the error output, fix the failing test, re-run."

**Reference secrets by name.** "The API key is stored as \`VERCEL_TOKEN\` in secrets." Secrets sync to environment variables automatically — \`$VERCEL_TOKEN\` works in bash commands. Never hardcode actual keys.

**Verify every mutation.** File writes get read back. Deployments get fetched. Database changes get queried. If you changed it, confirm it took.

**Encode concrete details.** Skills are a performance cache — bake in specific names, values, paths, and preferences so they're available without a memory recall round-trip. If memory has newer data than a skill, update the skill to match during training.

## Evolving Skills

Skills are living documents. After using one several times:

1. **Compare to reality** — does the skill match how you actually execute the task? Remove steps you skip.
2. **Add edge cases** — problems you hit that the skill didn't anticipate.
3. **Compress** — if 5 lines can become 2 without losing clarity, compress them.
4. **Record in memory** — after improving a skill, \`remember\` what changed and why.

A skill you wrote on day 1 should look different on day 30. If it doesn't, you're not learning from practice.

## Companion Scripts

For skills involving API calls, data transformation, multi-step automation, or anything where an LLM tool-call chain would be fragile, strongly consider encoding the logic in a companion \`.mjs\` script. The skill markdown describes *what* and *when*; the script encodes *how* — deterministically.

- Scripts live at \`.ghostpaw/scripts/<skill-name>.mjs\` (ES modules, never CommonJS)
- Run via bash: \`node .ghostpaw/scripts/<skill-name>.mjs [args]\`
- Accept arguments via \`process.argv\`, output results to stdout as JSON
- Handle errors gracefully — print \`{"error": "..."}\` and exit 1
- Scripts get \`fetch()\`, the full Node.js stdlib, and \`process.env\` (all secrets synced automatically)
- For advanced use, scripts can import from \`./ghostpaw.mjs\` to access memory, sessions, or embeddings

**When to write a script vs use shell one-liners:**
- **Script**: API calls, JSON parsing, data transformation, loops/conditionals, multi-step fetch-and-process pipelines
- **Shell**: \`git\` operations, \`grep\`/\`find\`, process management, simple file moves, one-liners under ~80 chars
- **Rule of thumb**: if you'd need more than one tool call to do it, it should be a script

## Anti-Patterns

- **Don't duplicate SOUL.md.** Skills add domain knowledge. They don't redefine your personality.
- **Don't write encyclopedias.** Use \`memory\` for facts, skills for procedures.
- **Don't hardcode values.** Check for file existence, use environment variables, handle missing state.
- **Don't create skills you haven't tested.** A skill born from experience works. A skill born from imagination doesn't. Do the task first, then codify what worked.
- **Don't over-script.** Simple bash one-liners don't need a companion \`.mjs\` file. Match the complexity of the solution to the complexity of the problem.
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
- Is it over 80 lines? If so, consider splitting it.

## Step 4: Review Uncommitted Changes

Use the skills tool with action "diff" to check for skill files created or modified since the last training session. These accumulated during normal sessions and may be rough drafts. Clean them up:

- Tighten language, remove redundancy
- Add failure paths if missing
- Verify the structure follows the template from skill-craft

## Step 5: Identify Gaps

Compare your recalled experience to your current skills. Look for concrete signals:

- **New procedure**: a memory describes a workflow, preference, or correction that no existing skill captures. Example: a user correction about deployment ordering → create a deployment skill.
- **Improved procedure**: a memory contains an edge case, better approach, or preference that an existing skill is missing. Example: a memory about a retry workaround → update the relevant skill with that path.
- **Stale skill**: a skill describes a workflow you no longer follow, or memory shows the user has changed their approach. Update or remove it.
- **Details to encode**: memory contains specific names, values, paths, or preferences that a skill references only generically. Skills are a performance cache — bake in concrete details so they're available without a memory recall round-trip.
- **No gaps**: if current skills already capture your experience well, say so. Don't create skills for the sake of it.

## Step 6: Act

For each gap:

- **New skill**: write a new markdown file to skills/ with a clear title, steps, and failure paths. Follow the structure in skill-craft.
- **Improved skill**: edit the existing skill file. Compress where possible — keep skills under 80 lines.
- **Stale skill**: rewrite or delete the file.
- **Housekeeping**: fix typos, tighten language, remove cruft in any skill you touch.

Only act on real evidence from memories. Never speculate or create skills for imagined scenarios.

## Step 7: Summarize

After making changes, list exactly what you created or updated and why. Be specific about what triggered each change — which memory or experience led to which skill modification.

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

export const SKILL_SCOUT = `# Skill Scout

The playbook for a scouting session. When you're running a directed scout (\`/scout <direction>\` or \`ghostpaw scout <direction>\`), follow these steps. Scouting explores new territory — it's about discovering what you *could* learn, not refining what you already know.

## What Scouting Is

Scouting is forward-looking creative ideation. Training looks backward at accumulated experience and sharpens existing skills. Scouting looks forward at unexplored possibilities and discovers new ones. They complement each other but never overlap.

**The cardinal rule:** never suggest a skill whose primary function is already served by an existing skill, even if the approach, tooling, or implementation would differ. Improvements, refinements, and alternative approaches to existing skills belong in training, not scouting. Scouting is strictly for genuinely new capabilities the agent doesn't have yet.

A good scout report is specific, grounded, and actionable. It's not "you should try automation" — it's "your Monday repo-check routine across 4 repositories could become a single skill that generates a digest and posts it to Slack."

## Step 1: Understand Current Coverage

Use the skills tool with action "list" to see all existing skills. **Read the full content of every skill that might be even loosely related** to the direction being scouted — titles alone are not enough. You must deeply understand what's already covered before suggesting anything new. If the scouted direction is essentially a better version of something that already exists, stop here and say so — recommend improving the existing skill through training instead.

## Step 2: Gather Related Experience

Use the memory tool with action "recall" to search for memories related to the scouting direction. Look for:

- Past mentions of the topic
- Related workflows the user has performed
- Frustrations or manual processes in this area
- Tools or services the user already uses

## Step 3: Research (When Needed)

If the direction involves external tools, APIs, or technologies the user hasn't worked with before, use web_search and web_fetch to explore best practices, available services, and community approaches. Focus on what's achievable with the agent's actual capabilities (file ops, web, bash, scheduling, delegation).

Skip external research when the direction is about reorganizing, combining, or extending workflows the user already has — the context from steps 1-2 is sufficient.

## Step 4: Analyze Feasibility

Cross-reference findings with the user's context:

- What tools and access does the user have?
- What's the simplest first version that delivers value?
- What prerequisites are needed (API keys, configurations)?
- What failure modes should the skill handle?

## Step 5: Trail Report

Produce a concrete trail report with:

- **What**: One-paragraph description of what the skill would do
- **Why**: Why this matters for THIS user, grounded in their specific context
- **How**: What the skill file would contain — key steps, tools involved, verification. For skills involving API calls, data transformation, or multi-step automation, note that a companion \`.mjs\` script would make execution reliable and repeatable.
- **First steps**: 2-3 specific actions to get started
- **Limitations**: What this skill won't cover and why

## Step 6: Invite Action

End with a clear call-to-action. The user should know exactly what to do next — typically crafting the scouted direction into a skill. Suggest the skill filename and a draft outline.

## Anti-Patterns

- **Suggesting refinements of existing skills**: if an existing skill already handles the core function, the answer is training, not scouting. This is the most common and most important mistake to avoid.
- **Generic advice**: "You should automate more" is useless. Cite specific evidence from memories or sessions.
- **Hallucinated capabilities**: Don't suggest features the agent doesn't have.
- **Developer-only suggestions**: Non-coders use Ghostpaw too. "Set up a Node.js cron" is less helpful than "schedule a weekly report every Friday at 5pm."
- **Unbounded scope**: A good scout report targets ONE specific skill, not a feature suite.
`.trimEnd();
