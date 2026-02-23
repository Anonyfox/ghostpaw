import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  const lines = skills.map((s) => `- ${s.filename}: ${s.title}`);
  return [
    "## Skills",
    "",
    `You have ${skills.length} skill${skills.length === 1 ? "" : "s"} available in \`skills/\`. ` +
      "Read a skill file with the `read` tool when it's relevant to the current task. " +
      "Use `skills list` for ranks and details.",
    "",
    ...lines,
  ].join("\n");
}

export function assembleSystemPrompt(
  workspacePath: string,
  budgetSummary: string | null = null,
): string {
  const sections: string[] = [];

  sections.push(loadSoul(workspacePath) ?? DEFAULT_SOUL);

  const skills = loadSkillIndex(workspacePath);
  if (skills.length > 0) {
    sections.push(formatSkillIndex(skills));
  }

  if (budgetSummary) {
    sections.push(`## Budget\n\n${budgetSummary}`);
  }

  return sections.join("\n\n");
}
