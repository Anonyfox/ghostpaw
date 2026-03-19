import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSchedule } from "./row_to_schedule.ts";
import type { Schedule } from "./types.ts";

export function getDueSchedules(db: DatabaseHandle, now: number): Schedule[] {
  const rows = db
    .prepare(
      "SELECT * FROM schedules WHERE enabled = 1 AND next_run_at <= ? AND running_pid IS NULL",
    )
    .all(now);
  return rows.map((r) => rowToSchedule(r as Record<string, unknown>));
}
