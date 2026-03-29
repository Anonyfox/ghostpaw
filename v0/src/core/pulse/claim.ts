import type { DatabaseHandle } from "../../lib/database_handle.ts";

export function claimPulse(db: DatabaseHandle, id: number, nextRunAt: string): boolean {
  const result = db
    .prepare(
      `UPDATE pulses SET running = 1,
        started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        next_run_at = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ? AND running = 0 AND enabled = 1
        AND next_run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
    .run(nextRunAt, id);
  return result.changes === 1;
}
