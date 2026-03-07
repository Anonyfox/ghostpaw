import { createTool, Schema } from "chatoyant";
import { deleteSchedule, getSchedule } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ScheduleDeleteParams extends Schema {
  id = Schema.Number({ description: "ID of the custom schedule to delete." });
}

export function createScheduleDeleteTool(db: DatabaseHandle) {
  return createTool({
    name: "schedule_delete",
    description:
      "Delete a custom scheduled job. Builtin schedules (haunt, distill) cannot be deleted — " +
      "disable them with schedule_update instead.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ScheduleDeleteParams() as any,
    execute: async ({ args }) => {
      const { id } = args as { id: number };
      const schedule = getSchedule(db, id);
      const name = schedule?.name ?? `#${id}`;

      deleteSchedule(db, id);

      return { deleted: name };
    },
  });
}
