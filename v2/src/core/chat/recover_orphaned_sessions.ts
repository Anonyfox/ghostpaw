import type { DatabaseHandle } from "../../lib/index.ts";

export function recoverOrphanedSessions(db: DatabaseHandle): number {
  const result = db
    .prepare(
      `UPDATE sessions
       SET closed_at = ?, error = ?
       WHERE purpose = 'delegate'
         AND closed_at IS NULL
         AND parent_session_id IS NOT NULL
         AND parent_session_id IN (
           SELECT id FROM sessions WHERE closed_at IS NOT NULL
         )`,
    )
    .run(Date.now(), "Process interrupted before completion.");
  return result.changes;
}
