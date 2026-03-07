import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function staleQuests(db: DatabaseHandle, limit = 5): Quest[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = db
    .prepare(
      `SELECT * FROM quests
       WHERE status = 'active' AND updated_at < ?
       ORDER BY updated_at ASC LIMIT ?`,
    )
    .all(sevenDaysAgo, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
