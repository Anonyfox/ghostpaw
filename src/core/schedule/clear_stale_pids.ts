import type { DatabaseHandle } from "../../lib/index.ts";

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcess(pid: number): void {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Already dead — nothing to do.
  }
}

export function clearStalePids(db: DatabaseHandle): number {
  const rows = db
    .prepare(
      "SELECT id, running_pid, started_at, timeout_ms FROM schedules WHERE running_pid IS NOT NULL",
    )
    .all() as {
    id: number;
    running_pid: number;
    started_at: number | null;
    timeout_ms: number | null;
  }[];

  let cleared = 0;
  const now = Date.now();
  const clearStmt = db.prepare(
    `UPDATE schedules SET
       running_pid = NULL,
       started_at = NULL,
       last_exit_code = -1,
       last_error = ?,
       fail_count = fail_count + 1,
       updated_at = ?
     WHERE id = ? AND running_pid = ?`,
  );

  for (const row of rows) {
    const alive = isProcessAlive(row.running_pid);
    const timedOut =
      alive &&
      row.timeout_ms !== null &&
      row.started_at !== null &&
      now - row.started_at > row.timeout_ms;

    if (!alive) {
      clearStmt.run("process exited unexpectedly", now, row.id, row.running_pid);
      cleared++;
    } else if (timedOut) {
      killProcess(row.running_pid);
      clearStmt.run(`job timed out after ${row.timeout_ms}ms`, now, row.id, row.running_pid);
      cleared++;
    }
  }

  return cleared;
}
