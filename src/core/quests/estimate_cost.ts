import type { DatabaseHandle } from "../../lib/index.ts";
import { getQuestCostHistory, type QuestCostRecord } from "../chat/api/read/index.ts";

export interface CostEstimate {
  low: number;
  high: number;
  avgXP: number;
  confidence: "none" | "low" | "medium" | "high";
  sampleSize: number;
}

const EMPTY: CostEstimate = { low: 0, high: 0, avgXP: 0, confidence: "none", sampleSize: 0 };

function confidenceLevel(n: number): CostEstimate["confidence"] {
  if (n === 0) return "none";
  if (n <= 2) return "low";
  if (n <= 5) return "medium";
  return "high";
}

export function estimateQuestCost(db: DatabaseHandle, questId: number): CostEstimate {
  const history = getQuestCostHistory(db);
  if (history.length === 0) return EMPTY;

  const subgoalCount =
    (
      db.prepare("SELECT COUNT(*) AS cnt FROM quest_subgoals WHERE quest_id = ?").get(questId) as {
        cnt: number;
      }
    ).cnt || 1;

  const avgSubgoals = averageSubgoals(db, history);
  const ratio = subgoalCount / avgSubgoals;

  const costs = history.map((r) => r.totalCost);
  const xps = history.map((r) => r.totalXP);
  const avgCost = (costs.reduce((a, b) => a + b, 0) / costs.length) * ratio;
  const avgXP = (xps.reduce((a, b) => a + b, 0) / xps.length) * ratio;

  const minObs = Math.min(...costs) * ratio;
  const maxObs = Math.max(...costs) * ratio;
  const low = Math.max(minObs, avgCost * 0.6);
  const high = Math.min(maxObs * 1.2, avgCost * 1.5);

  return {
    low: Math.round(low * 10000) / 10000,
    high: Math.round(Math.max(high, low) * 10000) / 10000,
    avgXP: Math.round(avgXP * 100) / 100,
    confidence: confidenceLevel(history.length),
    sampleSize: history.length,
  };
}

function averageSubgoals(db: DatabaseHandle, history: QuestCostRecord[]): number {
  const ids = history.map((r) => r.questId);
  const placeholders = ids.map(() => "?").join(",");
  const row = db
    .prepare(
      `SELECT AVG(cnt) AS avg_cnt FROM (SELECT COUNT(*) AS cnt FROM quest_subgoals WHERE quest_id IN (${placeholders}) GROUP BY quest_id)`,
    )
    .get(...ids) as { avg_cnt: number | null };
  return row.avg_cnt ?? 1;
}
