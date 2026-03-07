import type { DatabaseHandle } from "../../lib/index.ts";
import { getSchedule } from "./get_schedule.ts";
import type { Schedule, UpdateScheduleInput } from "./types.ts";

export function updateSchedule(
  db: DatabaseHandle,
  id: number,
  input: UpdateScheduleInput,
): Schedule {
  const existing = getSchedule(db, id);
  if (!existing) throw new Error(`Schedule #${id} not found.`);

  if (input.command !== undefined && existing.type === "builtin") {
    throw new Error("Cannot change the command of a builtin schedule.");
  }
  if (input.command !== undefined && !input.command.trim()) {
    throw new Error("Schedule command must not be empty.");
  }
  if (input.intervalMs !== undefined && input.intervalMs < 60_000) {
    throw new Error("Schedule interval must be at least 60000ms (1 minute).");
  }

  const now = Date.now();
  const newInterval = input.intervalMs ?? existing.intervalMs;
  const newEnabled = input.enabled ?? existing.enabled;
  const newCommand = input.command?.trim() ?? existing.command;

  let nextRunAt = existing.nextRunAt;
  if (input.intervalMs !== undefined && input.intervalMs !== existing.intervalMs) {
    nextRunAt = now + input.intervalMs;
  }

  db.prepare(
    `UPDATE schedules SET command = ?, interval_ms = ?, enabled = ?, next_run_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(newCommand, newInterval, newEnabled ? 1 : 0, nextRunAt, now, id);

  return getSchedule(db, id) as Schedule;
}
