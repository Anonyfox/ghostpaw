import type { DatabaseHandle } from "../../lib/index.ts";

/**
 * Returns IDs of open quest sessions whose last activity is older than `cutoffMs`
 * (epoch millis). These are orphans from killed/crashed embark processes.
 */
export function listStaleQuestSessionIds(db: DatabaseHandle, cutoffMs: number): number[] {
  const rows = db
    .prepare(
      `SELECT id FROM sessions
       WHERE quest_id IS NOT NULL
         AND closed_at IS NULL
         AND last_active_at < ?`,
    )
    .all(cutoffMs) as { id: number }[];
  return rows.map((r) => r.id);
}
