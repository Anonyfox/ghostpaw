import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createQuestAcceptTool } from "./accept.ts";
import { createQuestCreateTool } from "./create.ts";
import { createQuestDismissTool } from "./dismiss.ts";
import { createQuestDoneTool } from "./done.ts";
import { createQuestListTool } from "./list.ts";
import { createStorylineCreateTool } from "./storyline_create.ts";
import { createStorylineListTool } from "./storyline_list.ts";
import { createQuestSubgoalsTool } from "./subgoals.ts";
import { createQuestTurnInTool } from "./turn_in.ts";
import { createQuestUpdateTool } from "./update.ts";

export function createQuestTools(db: DatabaseHandle): Tool[] {
  return [
    createQuestListTool(db),
    createQuestCreateTool(db),
    createQuestUpdateTool(db),
    createQuestDoneTool(db),
    createQuestTurnInTool(db),
    createQuestAcceptTool(db),
    createQuestDismissTool(db),
    createStorylineListTool(db),
    createStorylineCreateTool(db),
    createQuestSubgoalsTool(db),
  ];
}
