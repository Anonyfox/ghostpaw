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
      `SELECT quests.*,
              COALESCE(quests.due_at, storylines.due_at) AS effective_due
       FROM quests
       LEFT JOIN storylines ON quests.storyline_id = storylines.id
       WHERE quests.status IN ('accepted', 'active')
         AND quests.created_by = 'ghostpaw'
         AND quests.rrule IS NULL
         AND (quests.storyline_id IS NULL OR NOT EXISTS (
           SELECT 1 FROM quests q2
           WHERE q2.storyline_id = quests.storyline_id
             AND q2.position < quests.position
             AND q2.status NOT IN ('done','turned_in','failed','abandoned')
         ))
       ORDER BY
         CASE WHEN quests.status = 'active' THEN 0 ELSE 1 END,
         CASE WHEN effective_due IS NOT NULL AND effective_due < ? THEN 0
              WHEN effective_due IS NOT NULL THEN 1
              ELSE 2 END,
         effective_due ASC,
         quests.created_at ASC
       LIMIT ?`,
    )
    .all(now, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
