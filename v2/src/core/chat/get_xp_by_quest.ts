import type { DatabaseHandle } from "../../lib/index.ts";

export function getXPByQuest(db: DatabaseHandle, questId: number): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(xp_earned), 0) AS total FROM sessions WHERE quest_id = ? AND closed_at IS NOT NULL",
    )
    .get(questId) as { total: number };
  return row.total;
}
