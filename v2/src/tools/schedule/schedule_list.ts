import { createTool } from "chatoyant";
import { listSchedules } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function createScheduleListTool(db: DatabaseHandle) {
  return createTool({
    name: "schedule_list",
    description:
      "List all scheduled jobs with their status, interval, next run time, " +
      "and last run info. Shows both builtin and custom schedules.",
    parameters: {},
    execute: async () => {
      const schedules = listSchedules(db);
      const entries = schedules.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        command: s.command,
        intervalMs: s.intervalMs,
        enabled: s.enabled,
        nextRunAt: new Date(s.nextRunAt).toISOString(),
        running: s.runningPid !== null,
        lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toISOString() : null,
        lastExitCode: s.lastExitCode,
        lastError: s.lastError,
        runCount: s.runCount,
        failCount: s.failCount,
      }));
      return { schedules: entries };
    },
  });
}
