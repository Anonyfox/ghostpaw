import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function dueSoonQuests(db: DatabaseHandle, horizonMs: number, limit = 5): Quest[] {
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT * FROM quests
       WHERE due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
         AND status NOT IN ('offered','done','failed','abandoned')
       ORDER BY due_at ASC LIMIT ?`,
    )
    .all(now, now + horizonMs, limit) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
