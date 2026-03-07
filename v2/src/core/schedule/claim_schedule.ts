import type { DatabaseHandle } from "../../lib/index.ts";

export function claimSchedule(
  db: DatabaseHandle,
  id: number,
  expectedNextRun: number,
  newNextRun: number,
  pid: number,
): boolean {
  const result = db
    .prepare(
      `UPDATE schedules
       SET next_run_at = ?, running_pid = ?, updated_at = ?
       WHERE id = ? AND next_run_at = ? AND enabled = 1 AND running_pid IS NULL`,
    )
    .run(newNextRun, pid, Date.now(), id, expectedNextRun);
  return result.changes === 1;
}
