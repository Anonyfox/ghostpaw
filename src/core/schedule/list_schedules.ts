import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSchedule } from "./row_to_schedule.ts";
import type { Schedule } from "./types.ts";

export function listSchedules(db: DatabaseHandle): Schedule[] {
  const rows = db.prepare("SELECT * FROM schedules ORDER BY id").all();
  return rows.map((r) => rowToSchedule(r as Record<string, unknown>));
}
