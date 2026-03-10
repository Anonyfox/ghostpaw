import type { DatabaseHandle } from "../../lib/index.ts";
import type { DelegationStats } from "./delegation_stats.ts";

const DELEGATION_STATS_SQL = `
  SELECT
    COUNT(*)                                                                              AS total,
    COALESCE(SUM(CASE WHEN closed_at IS NOT NULL AND error IS NULL THEN 1 ELSE 0 END), 0) AS completed,
    COALESCE(SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END), 0)                       AS failed,
    COALESCE(AVG(cost_usd), 0)                                                            AS avg_cost,
    COALESCE(SUM(cost_usd), 0)                                                            AS total_cost,
    COALESCE(SUM(tokens_in), 0)                                                           AS total_in,
    COALESCE(SUM(tokens_out), 0)                                                          AS total_out
  FROM sessions
  WHERE purpose = 'delegate' AND soul_id = ? AND created_at >= ?`;

export function queryStatsSince(
  db: DatabaseHandle,
  soulId: number,
  sinceMs: number,
): DelegationStats {
  const row = db.prepare(DELEGATION_STATS_SQL).get(soulId, sinceMs) as Record<string, number>;
  return {
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    avgCostUsd: row.avg_cost,
    totalCostUsd: row.total_cost,
    totalTokensIn: row.total_in,
    totalTokensOut: row.total_out,
  };
}
