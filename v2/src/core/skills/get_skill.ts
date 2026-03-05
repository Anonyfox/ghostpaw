import { parseSkill } from "./parse_skill.ts";
import type { Skill } from "./types.ts";

export function getSkill(workspace: string, name: string): Skill | null {
  return parseSkill(workspace, name);
}
