import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getSkillMarkdown(workspace: string, name: string): string | null {
  try {
    return readFileSync(join(workspace, "skills", name, "SKILL.md"), "utf-8");
  } catch {
    return null;
  }
}
