import type { DatabaseHandle } from "../../lib/index.ts";

const DEFAULT_OLDER_THAN_MS = 60 * 60 * 1000;

export function pruneEmptySessions(db: DatabaseHandle, olderThanMs?: number): number {
  const cutoff = Date.now() - (olderThanMs ?? DEFAULT_OLDER_THAN_MS);
  const result = db
    .prepare(
      `DELETE FROM sessions
       WHERE created_at < ?
         AND id NOT IN (SELECT DISTINCT session_id FROM messages)
         AND id NOT IN (
           SELECT parent_session_id FROM sessions
           WHERE purpose = 'delegate' AND closed_at IS NULL AND parent_session_id IS NOT NULL
         )
         AND NOT (purpose = 'delegate' AND closed_at IS NULL)`,
    )
    .run(cutoff);
  return result.changes;
}
