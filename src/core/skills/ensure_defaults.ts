import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SKILLS } from "./defaults.ts";

function buildSkillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;
}

export function ensureDefaults(workspace: string): string[] {
  const skillsDir = join(workspace, "skills");
  mkdirSync(skillsDir, { recursive: true });

  const created: string[] = [];

  for (const [name, { description, body }] of Object.entries(DEFAULT_SKILLS)) {
    const skillDir = join(skillsDir, name);
    if (existsSync(skillDir)) continue;

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), buildSkillMd(name, description, body), "utf-8");
    created.push(name);
  }

  return created.sort();
}
