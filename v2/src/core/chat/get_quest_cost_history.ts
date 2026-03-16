import type { DatabaseHandle } from "../../lib/index.ts";

export interface QuestCostRecord {
  questId: number;
  totalCost: number;
  totalXP: number;
  sessionCount: number;
}

export function getQuestCostHistory(db: DatabaseHandle): QuestCostRecord[] {
  const rows = db
    .prepare(
      `SELECT s.quest_id, SUM(s.cost_usd) AS total_cost, SUM(s.xp_earned) AS total_xp, COUNT(*) AS session_count
       FROM sessions s
       JOIN quests q ON s.quest_id = q.id
       WHERE q.created_by = 'ghostpaw' AND q.status = 'done' AND s.closed_at IS NOT NULL
       GROUP BY s.quest_id`,
    )
    .all() as { quest_id: number; total_cost: number; total_xp: number; session_count: number }[];

  return rows.map((r) => ({
    questId: r.quest_id,
    totalCost: r.total_cost,
    totalXP: r.total_xp,
    sessionCount: r.session_count,
  }));
}
