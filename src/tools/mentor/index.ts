import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createExecuteLevelUpTool } from "./execute_level_up.ts";
import { createProposeTraitTool } from "./propose_trait.ts";
import { createReactivateTraitTool } from "./reactivate_trait.ts";
import { createRevertLevelUpTool } from "./revert_level_up.ts";
import { createRevertTraitTool } from "./revert_trait.ts";
import { createReviewSoulTool } from "./review_soul.ts";
import { createReviseTraitTool } from "./revise_trait.ts";

export function createMentorTools(db: DatabaseHandle): Tool[] {
  return [
    createReviewSoulTool(db),
    createProposeTraitTool(db),
    createReviseTraitTool(db),
    createRevertTraitTool(db),
    createReactivateTraitTool(db),
    createExecuteLevelUpTool(db),
    createRevertLevelUpTool(db),
  ];
}
