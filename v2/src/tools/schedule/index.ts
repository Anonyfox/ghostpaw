import type { Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { createScheduleCreateTool } from "./schedule_create.ts";
import { createScheduleDeleteTool } from "./schedule_delete.ts";
import { createScheduleListTool } from "./schedule_list.ts";
import { createScheduleUpdateTool } from "./schedule_update.ts";

export function createScheduleTools(db: DatabaseHandle): Tool[] {
  return [
    createScheduleListTool(db),
    createScheduleCreateTool(db),
    createScheduleUpdateTool(db),
    createScheduleDeleteTool(db),
  ];
}
