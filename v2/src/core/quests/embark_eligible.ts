import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

/**
 * Returns quests eligible for autonomous embark by ghostpaw.
 * Priority: active (continuation) > overdue deadline > approaching deadline > oldest first.
 * Non-recurring only (recurring quests have their own cadence).
 */
export function embarkEligible(db: DatabaseHandle, limit = 5): Quest[] {
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT * FROM quests
       WHERE status IN ('accepted', 'active')
         AND created_by = 'ghostpaw'
         AND rrule IS NULL
       ORDER BY
         CASE WHEN status = 'active' THEN 0 ELSE 1 END,
         CASE WHEN due_at IS NOT NULL AND due_at < ? THEN 0
              WHEN due_at IS NOT NULL THEN 1
              ELSE 2 END,
         due_at ASC,
         created_at ASC
       LIMIT ?`,
    )
    .all(now, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
