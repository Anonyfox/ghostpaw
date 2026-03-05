import type { DefaultSkill } from "./types.ts";

export const DEFAULT_SKILLS: Record<string, DefaultSkill> = {
  "skill-training": {
    description:
      "The systematic training playbook — how to turn accumulated experience into sharper skills during retrospective sessions.",
    body: `# Skill Training

> **Trainer playbook.** This skill is the operating manual for the Trainer soul.
> If you are not the Trainer, delegate skill training to the Trainer specialist
> instead of following these steps directly — you do not have the required tools.

The playbook for a training session. When you're in training mode, follow these steps in order. Training turns accumulated experience into sharper skills.

## How Training Works

Training has three automatic phases:

1. **Distill** — unprocessed sessions are scanned and learnings are extracted into memories automatically (this happens before you start). You don't need to do anything for this step.
2. **Train** — you follow the steps below to turn memories into skills.
3. **Tidy** — old distilled sessions are cleaned up automatically after you're done.

## Step 1: Check Growth Status

Use the \`review_skills\` tool to see the current state: how many skills you have, their total and average rank, and how many have pending changes. Then use \`recall\` with a broad query to see how many memories are available. This tells you how much raw material you have to work with.

## Step 2: Recall Experience

Use the \`recall\` tool to search for recent experience. Cast a wide net — try multiple queries:

- "recent tasks and outcomes"
- "mistakes and corrections"
- "user preferences and feedback"
- "new procedures learned"
- "repeated workflows"

Read each result carefully. These are the raw material for new skills or skill improvements.

## Step 3: Review Current Skills

Use the \`review_skills\` tool to see all skills with their ranks and pending changes. For each relevant one, use \`read\` to inspect its \`SKILL.md\`. Note:

- Does it still match how you actually execute the task?
- Are there edge cases you've hit that it doesn't cover?
- Is there cruft — verbose sections, outdated steps, redundant notes?
- Is it over 80 lines? If so, consider splitting it.

## Step 4: Review Uncommitted Changes

Use the \`skill_diff\` tool with the skill name to check for changes since the last checkpoint. These accumulated during normal sessions and may be rough drafts. Clean them up:
- Tighten language, remove redundancy
- Add failure paths if missing
- Verify the structure follows the template from skill-scout

## Step 5: Identify Gaps

Compare your recalled experience to your current skills. Look for concrete signals:

- **New procedure**: a memory describes a workflow, preference, or correction that no existing skill captures. Example: a user correction about deployment ordering → create a deployment skill.
- **Improved procedure**: a memory contains an edge case, better approach, or preference that an existing skill is missing. Example: a memory about a retry workaround → update the relevant skill with that path.
- **Stale skill**: a skill describes a workflow you no longer follow, or memory shows the user has changed their approach. Update or remove it.
- **Details to encode**: memory contains specific names, values, paths, or preferences that a skill references only generically. Skills are a performance cache — bake in concrete details so they're available without a \`recall\` round-trip.
- **No gaps**: if current skills already capture your experience well, say so. Don't create skills for the sake of it.

## Step 6: Act

For each gap:

- **New skill**: use \`write\` to create \`skills/<name>/SKILL.md\` with a clear title, steps, and failure paths. Follow the structure in skill-scout.
- **Improved skill**: use \`edit\` on the existing \`SKILL.md\`. Compress where possible — keep skills under 80 lines.
- **Stale skill**: rewrite or delete the skill folder.
- **Housekeeping**: fix typos, tighten language, remove cruft in any skill you touch.

Only act on real evidence from memories. Never speculate or create skills for imagined scenarios.

## Step 7: Checkpoint and Summarize

After making changes, use the \`checkpoint_skills\` tool to commit your improvements. Pass the skill names as a JSON array and a descriptive message:

- \`skills\`: \`'["deploy","testing"]'\` — the skills you changed
- \`message\`: a short description of what you improved and why

Then list exactly what you created or updated and why. Be specific about what triggered each change — which memory or experience led to which skill modification.

## Skill History

Your skills directory is tracked by git (stored in \`.ghostpaw/skill-history/\`). Checkpoints create commits. Use the history tools to inspect:

- \`skill_history\` with a skill name — view commit log
- \`skill_diff\` with a skill name — see uncommitted changes
- \`rollback_skill\` with a skill name and commit hash — revert to a previous version

## When to Train

Training is most valuable when:

- There are many undistilled sessions (raw experience waiting to be processed)
- A stretch of varied tasks (lots of new experience to codify)
- Repeated encounters with the same workflow (time to formalize it)
- User corrections or feedback (capture preferences before they're forgotten)`,
  },

  "skill-scout": {
    description:
      "The scouting playbook — discovering new capabilities and creating skills from discovery through to a checkpointed initial version.",
    body: `# Skill Scout

> **Trainer playbook.** This skill is the operating manual for scouting sessions.
> If you are not the Trainer, delegate scouting to the Trainer specialist
> with a direction, e.g. \`delegate specialist="Trainer" task="Scout: <direction>"\`.

The playbook for a scouting session. Scouting is the full journey from discovery to a working, checkpointed skill at rank 1. It covers exploring what the agent doesn't know yet AND creating the skill when a clear opportunity is found.

## What Scouting Is

Scouting is forward-looking creative ideation followed by focused creation. Training looks backward at accumulated experience and sharpens existing skills. Scouting looks forward at unexplored possibilities, discovers new ones, and brings them to life as working skills.

**The cardinal rule:** never suggest a skill whose primary function is already served by an existing skill, even if the approach, tooling, or implementation would differ. Improvements belong in training. Scouting is strictly for genuinely new capabilities.

## When to Create a Skill

Watch for these signals:

- **Trial and error**: the agent took 3+ tool calls to figure something out. The working approach should become a skill.
- **User correction**: the user told the agent how they want something done. Capture the preference.
- **Repeated pattern**: a procedure appeared across multiple sessions. Formalize it.
- **Non-obvious workflow**: steps that aren't intuitive (specific flags, required ordering, environment quirks).

Do NOT create a skill for:
- One-off tasks that won't repeat
- Tasks where the default behavior already works correctly
- Pure facts (use \`remember\` instead — skills are for procedures)
- Speculation about tasks not yet actually performed

**MCP servers are a special case.** When the agent successfully connects to an external MCP server, always create a per-server skill. See \`skill-mcp\` for the template.

## Step 1: Understand Current Coverage

Use \`review_skills\` to see all skills, then \`read\` the \`SKILL.md\` of **every skill that might be even loosely related** — titles alone are not enough. If the scouted direction is a better version of something that exists, recommend training instead.

## Step 2: Gather Related Experience

Use \`recall\` to search for memories related to the direction. Look for:

- Past mentions of the topic
- Related workflows, frustrations, manual processes
- Tools or services the user already uses

## Step 3: Research (When Needed)

If the direction involves external tools or technologies, use \`web_search\` and \`web_fetch\` to explore. **Consider MCP servers** — search for "\`{service} MCP server\`" or check the OpenMCP registry (\`https://mcp.open-mcp.org\`). Skip research when the direction is about workflows the user already has.

## Step 4: Analyze and Propose

Cross-reference findings with the user's context. For each viable skill opportunity, assess:

- What tools and access does the user have?
- What's the simplest first version that delivers value?
- What prerequisites are needed?
- What failure modes should the skill handle?

## Step 5: Create the Skill

### Skill Folder Structure

\`\`\`
skills/<skill-name>/
  SKILL.md              # Required: YAML frontmatter + markdown body
  scripts/              # Optional: executable code
  references/           # Optional: docs loaded on demand
  assets/               # Optional: templates, data files
\`\`\`

SKILL.md format:

\`\`\`yaml
---
name: skill-name
description: One-line summary of what this skill does.
---
\`\`\`

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
\`\`\`

### Writing Effective Instructions

**Name your tools.** Not "check the file" but "use \`read\` to inspect \`package.json\`."
**Include failure paths.** After "run \`npm test\`", add: "if tests fail, read the error, fix, re-run."
**Reference secrets by name.** Never hardcode actual keys.
**Verify every mutation.** File writes get read back. Deployments get fetched.
**Encode concrete details.** Skills are a performance cache — bake in specific names, values, paths.
**Target 20–50 lines.** If a skill exceeds 80 lines, split it.

### Companion Scripts

For API calls, data transformation, or multi-step automation, use a companion script:

- Scripts live at \`skills/<skill-name>/scripts/<name>.mjs\` (ES modules)
- Run via bash: \`node skills/<skill-name>/scripts/<name>.mjs [args]\`
- Output results to stdout as JSON, handle errors with \`{"error": "..."}\` and exit 1

## Step 6: Validate and Checkpoint

After creating the skill:

1. Run \`validate_skills\` to verify structural correctness.
2. Use \`checkpoint_skills\` with the new skill name and a descriptive message.
3. The skill MUST be checkpointed to reach rank 1. A skill at rank 0 is unfinished.

## Anti-Patterns

- **Suggesting refinements of existing skills**: improvements belong in training, not scouting.
- **Generic advice**: cite specific evidence from memories or sessions.
- **Don't create skills you haven't tested.** A skill born from experience works. A skill born from imagination doesn't.
- **Don't duplicate SOUL.md.** Skills add domain knowledge, not personality.
- **Unbounded scope**: target ONE specific skill, not a feature suite.`,
  },

  "skill-mcp": {
    description:
      "How to discover, use, and build skills around external MCP (Model Context Protocol) servers.",
    body: `# MCP Server Integration

How to discover, use, and build skills around external MCP (Model Context Protocol) servers. Read this when you encounter an MCP server endpoint or need to connect to an external tool ecosystem.

## The \`mcp\` Tool

You have one built-in tool for all MCP interactions. It has two actions:

- **\`discover\`**: connect to a server and list its available tools with parameters
- **\`call\`**: invoke a specific tool on a connected server

The tool auto-detects transport: URLs (\`https://...\`) use HTTP, command strings (\`npx -y @mcp/server\`) use stdio.

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| \`action\`  | always   | \`"discover"\` or \`"call"\` |
| \`server\`  | always   | URL for HTTP, or command string for stdio |
| \`tool\`    | for call | Name of the tool to invoke |
| \`input\`   | for call | Tool arguments as a **JSON object string** |
| \`auth\`    | if needed | Secret name(s) for authentication |

## Workflow: First Contact with a Server

1. **Discover** — call \`mcp\` with \`action: "discover"\` and the server endpoint. Omit \`auth\` for public servers, or pass the secret name for authenticated ones.
2. **Read the tool list** — note tool names, descriptions, and parameter schemas. Pay attention to required vs optional parameters and their types.
3. **Call a simple tool** — pick a read-only tool (list, get, search) and call it with \`action: "call"\`. Verify the result makes sense before relying on it.
4. **Document what you learned** — create a dedicated skill for this server (see template below).

## Input Formatting

The \`input\` parameter takes a **JSON object string**. Match the types from the discovered schema exactly:

- Numbers: \`{"lat": 48.2, "lon": 16.4}\` — NOT \`{"lat": "48.2"}\`
- Booleans: \`{"verbose": true}\` — NOT \`{"verbose": "true"}\`
- Arrays: \`{"tags": ["a", "b"]}\` — must be actual JSON arrays
- Required params must be present — the server rejects calls with missing required fields
- When unsure about parameter names or types, run \`discover\` first

## Auth Patterns

**HTTP servers (Bearer token)**:
- Store the API key via \`secrets set <KEY_NAME>\`
- Pass \`auth: "KEY_NAME"\` — it resolves to a Bearer token header automatically

**Stdio servers (env vars)**:
- Store each required env var via \`secrets set <VAR_NAME>\`
- Pass \`auth: "VAR1,VAR2"\` (comma-separated) — they're injected into the child process environment

**No auth**: many public servers need no auth at all. Just omit the \`auth\` parameter.

## Connection Caching

Connections are cached for the session duration. The first \`discover\` or \`call\` to a server establishes the connection; subsequent calls reuse it. If a connection fails, it's evicted from cache and the next call reconnects automatically. Different auth values for the same server create separate connections.

## Per-Server Skill Template

After successfully using an MCP server, create a skill so future sessions start with full knowledge:

\`\`\`
skills/<server-name>-mcp/
  SKILL.md     # Connection info, tools, usage patterns
  scripts/     # Optional: helper scripts for complex workflows
\`\`\`

SKILL.md content:

\`\`\`markdown
# [Server Name] via MCP

Connect to [what it does] via MCP.

## Connection

- Endpoint: \`https://example.com/mcp\` (or \`npx -y @scope/server\` for stdio)
- Auth: \`SECRET_NAME\` (Bearer token) / none
- Transport: HTTP / stdio

## Available Tools

- \`tool_name\` — what it does (key params: x, y)
- \`other_tool\` — what it does

## Usage Patterns

- [How to accomplish common task A]
- [How to accomplish common task B]

## Notes

- [Rate limits, quirks, failure modes]
- [Parameters that need special formatting]
- [Tools that don't work well or return unexpected formats]
\`\`\`

## Public Server Registries

- **OpenMCP**: \`https://mcp.open-mcp.org/api/server/{id}@latest/mcp\` — 1000+ servers, no auth for discovery
- Many APIs have community-maintained MCP servers — search for "\`{service} MCP server\`"

## Anti-Patterns

- **Don't guess tool names or parameters.** Always \`discover\` first. Server APIs change.
- **Don't skip the per-server skill.** Without it, every session re-discovers from scratch.
- **Don't hardcode auth tokens.** Use secret names so they resolve from the SecretStore.
- **Don't assume all tools work.** Some servers expose tools that require paid plans or specific permissions. Test before documenting.`,
  },
};
