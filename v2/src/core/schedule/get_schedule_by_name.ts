import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSchedule } from "./row_to_schedule.ts";
import type { Schedule } from "./types.ts";

export function getScheduleByName(db: DatabaseHandle, name: string): Schedule | undefined {
  const row = db.prepare("SELECT * FROM schedules WHERE name = ?").get(name);
  return row ? rowToSchedule(row as Record<string, unknown>) : undefined;
}
