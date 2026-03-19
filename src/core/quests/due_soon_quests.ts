import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function dueSoonQuests(db: DatabaseHandle, horizonMs: number, limit = 5): Quest[] {
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT quests.*
       FROM quests
       LEFT JOIN storylines ON quests.storyline_id = storylines.id
       WHERE COALESCE(quests.due_at, storylines.due_at) IS NOT NULL
         AND COALESCE(quests.due_at, storylines.due_at) >= ?
         AND COALESCE(quests.due_at, storylines.due_at) <= ?
         AND quests.status NOT IN ('offered','done','failed','abandoned')
       ORDER BY COALESCE(quests.due_at, storylines.due_at) ASC LIMIT ?`,
    )
    .all(now, now + horizonMs, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
