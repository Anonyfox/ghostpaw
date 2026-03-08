import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSchedule } from "./row_to_schedule.ts";
import type { CreateScheduleInput, Schedule } from "./types.ts";

export function createSchedule(db: DatabaseHandle, input: CreateScheduleInput): Schedule {
  const now = Date.now();
  const enabled = input.enabled ?? true;
  const nextRunAt = now + input.intervalMs;

  if (!input.name.trim()) throw new Error("Schedule name must not be empty.");
  if (!input.command.trim()) throw new Error("Schedule command must not be empty.");
  if (input.intervalMs < 60_000) {
    throw new Error("Schedule interval must be at least 60000ms (1 minute).");
  }
  if (input.timeoutMs !== undefined && input.timeoutMs <= 0) {
    throw new Error("Schedule timeout must be a positive number of milliseconds.");
  }

  const result = db
    .prepare(
      `INSERT INTO schedules (name, type, command, interval_ms, timeout_ms, enabled, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.type,
      input.command.trim(),
      input.intervalMs,
      input.timeoutMs ?? null,
      enabled ? 1 : 0,
      nextRunAt,
      now,
      now,
    );

  const row = db.prepare("SELECT * FROM schedules WHERE id = ?").get(result.lastInsertRowid);
  return rowToSchedule(row as Record<string, unknown>);
}
