import type { DatabaseHandle } from "../../lib/index.ts";
import { getSchedule } from "./get_schedule.ts";

export function deleteSchedule(db: DatabaseHandle, id: number): void {
  const existing = getSchedule(db, id);
  if (!existing) throw new Error(`Schedule #${id} not found.`);
  if (existing.type === "builtin") {
    throw new Error(`Cannot delete builtin schedule "${existing.name}".`);
  }

  db.prepare("DELETE FROM schedules WHERE id = ?").run(id);
}
