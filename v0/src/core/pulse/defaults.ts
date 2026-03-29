import type { DatabaseHandle } from "../../lib/database_handle.ts";

/** Due immediately on first boot; subsequent scheduling uses interval from claim. */
const HEARTBEAT_NEXT = "2000-01-01T00:00:00.000Z";

export const DEFAULT_PULSES: Array<{
  name: string;
  type: "builtin";
  command: string;
  interval_ms: number | null;
  cron_expr: string | null;
  timeout_ms: number;
  enabled: number;
  next_run_at: string;
}> = [
  {
    name: "heartbeat",
    type: "builtin",
    command: "heartbeat",
    interval_ms: 300_000,
    cron_expr: null,
    timeout_ms: 60_000,
    enabled: 1,
    next_run_at: HEARTBEAT_NEXT,
  },
];

export function ensureDefaultPulses(db: DatabaseHandle): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO pulses
      (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of DEFAULT_PULSES) {
    stmt.run(
      p.name,
      p.type,
      p.command,
      p.interval_ms,
      p.cron_expr,
      p.timeout_ms,
      p.enabled,
      p.next_run_at,
    );
  }
}
