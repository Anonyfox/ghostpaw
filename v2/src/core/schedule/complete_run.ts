import type { DatabaseHandle } from "../../lib/index.ts";

export function completeRun(
  db: DatabaseHandle,
  id: number,
  exitCode: number,
  error?: string | null,
): void {
  const now = Date.now();
  db.prepare(
    `UPDATE schedules SET
       running_pid = NULL,
       started_at = NULL,
       last_run_at = ?,
       last_exit_code = ?,
       last_error = ?,
       run_count = run_count + 1,
       fail_count = CASE WHEN ? != 0 THEN fail_count + 1 ELSE fail_count END,
       updated_at = ?
     WHERE id = ?`,
  ).run(now, exitCode, error ?? null, exitCode, now, id);
}
