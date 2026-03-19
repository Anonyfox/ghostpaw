import type { DatabaseHandle } from "../../lib/index.ts";

export function claimSchedule(
  db: DatabaseHandle,
  id: number,
  expectedNextRun: number,
  newNextRun: number,
  pid: number,
): boolean {
  const now = Date.now();
  const result = db
    .prepare(
      `UPDATE schedules
       SET next_run_at = ?, running_pid = ?, started_at = ?, updated_at = ?
       WHERE id = ? AND next_run_at = ? AND enabled = 1 AND running_pid IS NULL`,
    )
    .run(newNextRun, pid, now, now, id, expectedNextRun);
  return result.changes === 1;
}
