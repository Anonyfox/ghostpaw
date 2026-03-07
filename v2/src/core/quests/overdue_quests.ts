import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function overdueQuests(db: DatabaseHandle, limit = 5): Quest[] {
  const rows = db
    .prepare(
      `SELECT * FROM quests
       WHERE due_at IS NOT NULL AND due_at < ?
         AND status NOT IN ('offered','done','failed','cancelled')
       ORDER BY due_at ASC LIMIT ?`,
    )
    .all(Date.now(), limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
