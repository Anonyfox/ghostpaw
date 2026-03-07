import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function recentlyCompletedQuests(db: DatabaseHandle, since: number, limit = 5): Quest[] {
  const rows = db
    .prepare(
      `SELECT * FROM quests
       WHERE status = 'done' AND completed_at >= ?
       ORDER BY completed_at DESC LIMIT ?`,
    )
    .all(since, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
