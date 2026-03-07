import { createTool, Schema } from "chatoyant";
import { updateSchedule } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ScheduleUpdateParams extends Schema {
  id = Schema.Number({ description: "ID of the schedule to update." });
  interval_ms = Schema.Number({
    optional: true,
    description: "New interval in milliseconds. Minimum 60000 (1 minute).",
  });
  enabled = Schema.Boolean({
    optional: true,
    description: "Enable or disable the schedule.",
  });
  command = Schema.String({
    optional: true,
    description: "New command (custom schedules only — builtin commands cannot be changed).",
  });
}

export function createScheduleUpdateTool(db: DatabaseHandle) {
  return createTool({
    name: "schedule_update",
    description:
      "Update a scheduled job's interval, enabled status, or command. " +
      "For builtin schedules (haunt, distill), only interval and enabled can be changed. " +
      "Recalculates the next run time when the interval changes.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ScheduleUpdateParams() as any,
    execute: async ({ args }) => {
      const { id, interval_ms, enabled, command } = args as {
        id: number;
        interval_ms?: number;
        enabled?: boolean;
        command?: string;
      };

      const schedule = updateSchedule(db, id, {
        intervalMs: interval_ms,
        enabled,
        command,
      });

      return {
        updated: {
          id: schedule.id,
          name: schedule.name,
          command: schedule.command,
          intervalMs: schedule.intervalMs,
          enabled: schedule.enabled,
          nextRunAt: new Date(schedule.nextRunAt).toISOString(),
        },
      };
    },
  });
}
