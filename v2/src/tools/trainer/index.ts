import type { Tool } from "chatoyant";
import { createCheckpointSkillsTool } from "./checkpoint_skills.ts";
import { createCreateSkillTool } from "./create_skill.ts";
import { createReviewSkillsTool } from "./review_skills.ts";
import { createRollbackSkillTool } from "./rollback_skill.ts";
import { createSkillDiffTool } from "./skill_diff.ts";
import { createSkillHistoryTool } from "./skill_history.ts";
import { createValidateSkillsTool } from "./validate_skills.ts";

export function createTrainerTools(workspace: string): Tool[] {
  return [
    createReviewSkillsTool(workspace),
    createSkillDiffTool(workspace),
    createSkillHistoryTool(workspace),
    createCreateSkillTool(workspace),
    createCheckpointSkillsTool(workspace),
    createRollbackSkillTool(workspace),
    createValidateSkillsTool(workspace),
  ];
}
