import type { DatabaseHandle } from "../../lib/index.ts";
import { DEFAULT_SCHEDULES } from "./defaults.ts";

export function ensureDefaultSchedules(db: DatabaseHandle): void {
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO schedules (name, type, command, interval_ms, timeout_ms, enabled, next_run_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const s of DEFAULT_SCHEDULES) {
    const nextRunAt = now + s.intervalMs;
    stmt.run(
      s.name,
      s.type,
      s.command,
      s.intervalMs,
      s.timeoutMs ?? null,
      s.enabled ? 1 : 0,
      nextRunAt,
      now,
      now,
    );
  }
}
