import type { DatabaseHandle } from "../../lib/index.ts";

export function recoverOrphanedRuns(db: DatabaseHandle): number {
  const now = Date.now();
  const message = "Process interrupted before completion.";

  db.exec("BEGIN");
  try {
    db.prepare(
      `UPDATE sessions SET closed_at = ?
       WHERE id IN (
         SELECT child_session_id FROM delegation_runs
         WHERE status = 'running' AND child_session_id IS NOT NULL
       ) AND closed_at IS NULL`,
    ).run(now);

    const result = db
      .prepare(
        "UPDATE delegation_runs SET status = 'failed', error = ?, completed_at = ? WHERE status = 'running'",
      )
      .run(message, now);

    db.exec("COMMIT");
    return result.changes;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
