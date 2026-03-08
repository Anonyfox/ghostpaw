import { createTool, Schema } from "chatoyant";
import { createSchedule } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ScheduleCreateParams extends Schema {
  name = Schema.String({ description: "Unique name for the schedule." });
  command = Schema.String({ description: "Shell command to execute on each run." });
  interval_ms = Schema.Number({
    description: "Interval between runs in milliseconds. Minimum 60000 (1 minute).",
  });
  timeout_ms = Schema.Number({
    optional: true,
    description: "Maximum runtime in milliseconds. Job is killed if exceeded. Omit for no timeout.",
  });
  enabled = Schema.Boolean({
    optional: true,
    description: "Whether the schedule is enabled. Defaults to true.",
  });
}

export function createScheduleCreateTool(db: DatabaseHandle) {
  return createTool({
    name: "schedule_create",
    description:
      "Create a new custom scheduled job. The command runs as a shell command " +
      "at the specified interval. Minimum interval is 1 minute (60000ms). " +
      "Use schedule_list to see existing schedules. " +
      "Builtin schedules (haunt, distill) already exist and cannot be created this way.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ScheduleCreateParams() as any,
    execute: async ({ args }) => {
      const { name, command, interval_ms, timeout_ms, enabled } = args as {
        name: string;
        command: string;
        interval_ms: number;
        timeout_ms?: number;
        enabled?: boolean;
      };

      const schedule = createSchedule(db, {
        name,
        type: "custom",
        command,
        intervalMs: interval_ms,
        timeoutMs: timeout_ms,
        enabled,
      });

      return {
        created: {
          id: schedule.id,
          name: schedule.name,
          command: schedule.command,
          intervalMs: schedule.intervalMs,
          timeoutMs: schedule.timeoutMs,
          enabled: schedule.enabled,
          nextRunAt: new Date(schedule.nextRunAt).toISOString(),
        },
      };
    },
  });
}
