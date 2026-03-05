import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSkill } from "./parse_skill.ts";
import type { CreateSkillInput, Skill } from "./types.ts";

const VALID_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function createSkill(workspace: string, input: CreateSkillInput): Skill {
  if (!VALID_NAME.test(input.name)) {
    throw new Error(
      `Invalid skill name "${input.name}": must be lowercase alphanumeric with hyphens only.`,
    );
  }

  if (!input.description?.trim()) {
    throw new Error("Skill description is required.");
  }

  const skillDir = join(workspace, "skills", input.name);
  if (existsSync(skillDir)) {
    throw new Error(`Skill "${input.name}" already exists at skills/${input.name}/.`);
  }

  mkdirSync(skillDir, { recursive: true });

  const body = input.body?.trim() || `# ${input.name}\n`;
  const content = `---\nname: ${input.name}\ndescription: ${input.description}\n---\n\n${body}\n`;
  writeFileSync(join(skillDir, "SKILL.md"), content, "utf-8");

  if (input.scripts) {
    mkdirSync(join(skillDir, "scripts"), { recursive: true });
  }
  if (input.references) {
    mkdirSync(join(skillDir, "references"), { recursive: true });
  }

  const skill = parseSkill(workspace, input.name);
  if (!skill) throw new Error(`Failed to parse newly created skill "${input.name}".`);
  return skill;
}
