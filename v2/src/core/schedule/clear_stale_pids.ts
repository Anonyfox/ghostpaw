import type { DatabaseHandle } from "../../lib/index.ts";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function clearStalePids(db: DatabaseHandle): number {
  const rows = db
    .prepare("SELECT id, running_pid FROM schedules WHERE running_pid IS NOT NULL")
    .all() as { id: number; running_pid: number }[];

  let cleared = 0;
  const now = Date.now();

  for (const row of rows) {
    if (!isProcessAlive(row.running_pid)) {
      db.prepare(
        `UPDATE schedules SET
           running_pid = NULL,
           last_exit_code = -1,
           last_error = 'process exited unexpectedly',
           fail_count = fail_count + 1,
           updated_at = ?
         WHERE id = ? AND running_pid = ?`,
      ).run(now, row.id, row.running_pid);
      cleared++;
    }
  }

  return cleared;
}
