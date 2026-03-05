import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

export function deleteSkill(workspace: string, name: string): boolean {
  const skillDir = join(workspace, "skills", name);
  if (!existsSync(skillDir)) return false;

  rmSync(skillDir, { recursive: true, force: true });
  return true;
}
