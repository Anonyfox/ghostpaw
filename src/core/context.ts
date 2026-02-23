import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_IDENTITY = [
  "You are ghostpaw, an AI agent runtime.",
  "You have access to tools that let you read, write, and edit files, execute shell commands, and fetch web content.",
  "Always use the available tools to complete tasks. Be precise and thorough.",
  "When you encounter errors, report them clearly and suggest fixes.",
].join("\n");

function loadSoul(workspacePath: string): string | null {
  const soulPath = join(workspacePath, "SOUL.md");
  if (!existsSync(soulPath)) return null;
  const content = readFileSync(soulPath, "utf-8").trim();
  return content || null;
}

function loadSkills(workspacePath: string): string[] {
  const skillsDir = join(workspacePath, "skills");
  if (!existsSync(skillsDir)) return [];

  try {
    return readdirSync(skillsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => readFileSync(join(skillsDir, f), "utf-8").trim())
      .filter((content) => content.length > 0);
  } catch {
    return [];
  }
}

export function assembleSystemPrompt(
  workspacePath: string,
  budgetSummary: string | null = null,
): string {
  const sections: string[] = [];

  sections.push(loadSoul(workspacePath) ?? BASE_IDENTITY);

  const skills = loadSkills(workspacePath);
  if (skills.length > 0) {
    sections.push(`## Skills\n\n${skills.join("\n\n---\n\n")}`);
  }

  if (budgetSummary) {
    sections.push(`## Budget\n\n${budgetSummary}`);
  }

  return sections.join("\n\n");
}
