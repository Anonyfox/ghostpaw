import type { DatabaseHandle } from "../../../lib/index.ts";
import { logSkillEvent } from "../api/write/events.ts";
import { checkpoint } from "../checkpoint.ts";
import { ensureDefaults } from "../ensure_defaults.ts";
import { initHistory } from "../init_history.ts";
import { repairFlatFile, repairSkill } from "../repair_skill.ts";
import { validateAllSkills } from "../validate_skill.ts";

export function bootstrapSkills(workspace: string, db: DatabaseHandle): string[] {
  const created = ensureDefaults(workspace);

  for (const validation of validateAllSkills(workspace)) {
    if (!validation.valid && validation.issues.some((issue) => issue.autoFixable)) {
      if (validation.issues.some((issue) => issue.code === "flat-file")) {
        repairFlatFile(workspace, validation.name);
      } else {
        repairSkill(workspace, validation.name);
      }
    }
  }

  initHistory(workspace);

  if (created.length > 0) {
    for (const name of created) {
      logSkillEvent(db, name, "created");
    }
    checkpoint(workspace, created, "bootstrap: initial version", db);
  }

  return created;
}
