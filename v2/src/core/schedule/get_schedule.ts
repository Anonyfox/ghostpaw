import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSchedule } from "./row_to_schedule.ts";
import type { Schedule } from "./types.ts";

export function getSchedule(db: DatabaseHandle, id: number): Schedule | undefined {
  const row = db.prepare("SELECT * FROM schedules WHERE id = ?").get(id);
  return row ? rowToSchedule(row as Record<string, unknown>) : undefined;
}
