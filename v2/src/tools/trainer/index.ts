import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createCheckpointSkillsTool } from "./checkpoint_skills.ts";
import { createCreateSkillTool } from "./create_skill.ts";
import { createDropFragmentTool } from "./drop_fragment.ts";
import { createReviewSkillsTool } from "./review_skills.ts";
import { createRollbackSkillTool } from "./rollback_skill.ts";
import { createSkillDiffTool } from "./skill_diff.ts";
import { createSkillHistoryTool } from "./skill_history.ts";
import { createValidateSkillsTool } from "./validate_skills.ts";

export function createTrainerTools(workspace: string, db?: DatabaseHandle): Tool[] {
  return [
    createReviewSkillsTool(workspace, db),
    createSkillDiffTool(workspace),
    createSkillHistoryTool(workspace),
    createCreateSkillTool(workspace, db),
    createCheckpointSkillsTool(workspace, db),
    createRollbackSkillTool(workspace),
    createValidateSkillsTool(workspace),
  ];
}

export function createStokeTools(db: DatabaseHandle): Tool[] {
  return [createDropFragmentTool(db)];
}
