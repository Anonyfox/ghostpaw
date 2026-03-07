import type { Schedule } from "./types.ts";

export function rowToSchedule(row: Record<string, unknown>): Schedule {
  return {
    id: row.id as number,
    name: row.name as string,
    type: row.type as Schedule["type"],
    command: row.command as string,
    intervalMs: row.interval_ms as number,
    enabled: (row.enabled as number) === 1,
    nextRunAt: row.next_run_at as number,
    runningPid: (row.running_pid as number | null) ?? null,
    lastRunAt: (row.last_run_at as number | null) ?? null,
    lastExitCode: (row.last_exit_code as number | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    runCount: row.run_count as number,
    failCount: row.fail_count as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
