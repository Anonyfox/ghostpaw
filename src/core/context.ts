import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEFAULT_SOUL } from "./soul.js";

function loadSoul(workspacePath: string): string | null {
  const soulPath = join(workspacePath, "SOUL.md");
  if (!existsSync(soulPath)) return null;
  const content = readFileSync(soulPath, "utf-8").trim();
  return content || null;
}

interface SkillEntry {
  filename: string;
  title: string;
}

function extractTitle(content: string): string {
  const line = content.split("\n").find((l) => l.trim().startsWith("#"));
  if (line) return line.replace(/^#+\s*/, "").trim();
  return "(untitled)";
}

function loadSkillIndex(workspacePath: string): SkillEntry[] {
  const skillsDir = join(workspacePath, "skills");
  if (!existsSync(skillsDir)) return [];

  try {
    return readdirSync(skillsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => {
        const content = readFileSync(join(skillsDir, f), "utf-8").trim();
        return { filename: f, title: extractTitle(content) };
      })
      .filter((e) => e.title.length > 0);
  } catch {
    return [];
  }
}

function formatSkillIndex(skills: SkillEntry[]): string {
  const lines = skills.map((s) => `- skills/${s.filename}: ${s.title}`);
  return [
    "## Skills",
    "",
    `You have ${skills.length} skill${skills.length === 1 ? "" : "s"}. ` +
      "Read a skill file with the `read` tool when it's relevant to the current task. " +
      "Use `skills list` for ranks and details.",
    "",
    ...lines,
  ].join("\n");
}

const MEMORY_GUIDANCE = `## Memory

Before answering questions, fulfilling requests, or making decisions where past context could matter, use \`memory recall\` with a relevant query to check for prior knowledge. This is automatic — don't ask the user first, just recall. When to recall:
- Questions about preferences, past work, or prior conversations
- Tasks where knowing the user's style, tools, or environment helps
- Any situation where you suspect you've encountered something similar before

Skip recall for straightforward tasks where past context clearly doesn't apply — writing code to a clear spec, running a specific command, answering general knowledge questions, or any request that is fully self-contained.

**Epistemic rule**: Memories describe what WAS true in past sessions — not what IS true now. After recalling memories, always verify claims about files, code, or state against live tool output (\`read\`, \`bash\`, \`skills\`). If a memory says "file X is a working 150-line script" but \`read\` returns \`lines: 1, bytes: 4000\`, the file is corrupted — report the actual state, not the memory.`;

function formatEnvironment(workspacePath: string): string {
  const abs = resolve(workspacePath);
  return `## Environment

- **Workspace root**: \`${abs}\`
- All file paths in \`read\`, \`write\`, and \`edit\` are **relative to this root**. Use paths like \`skills/foo.md\`, never absolute paths like \`/workspace/...\`.
- Tool results are the **only** source of truth. Never fabricate, guess, or paraphrase tool output. If a tool call fails or returns unexpected results, report that honestly.
- Do not invent file contents, command outputs, or error messages. If you haven't called the tool, you don't know the result.`;
}

export function assembleSystemPrompt(
  workspacePath: string,
  budgetSummary: string | null = null,
): string {
  const sections: string[] = [];

  sections.push(loadSoul(workspacePath) ?? DEFAULT_SOUL);

  sections.push(formatEnvironment(workspacePath));

  sections.push(MEMORY_GUIDANCE);

  const skills = loadSkillIndex(workspacePath);
  if (skills.length > 0) {
    sections.push(formatSkillIndex(skills));
  }

  if (budgetSummary) {
    sections.push(`## Budget\n\n${budgetSummary}`);
  }

  return sections.join("\n\n");
}
