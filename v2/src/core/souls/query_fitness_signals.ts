import type { DatabaseHandle } from "../../lib/index.ts";
import type { DelegationStats, TraitSnapshot } from "./gather_evidence.ts";

export interface WindowedStats {
  window: string;
  stats: DelegationStats;
}

export interface TraitFitness {
  traitId: number;
  principle: string;
  addedAt: number;
  statsSinceAdded: DelegationStats;
}

export interface CostTrend {
  recent7d: number;
  previous7d: number;
  direction: "cheaper" | "stable" | "costlier";
}

const DAY_MS = 86_400_000;

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

function rowToStats(row: Record<string, number>): DelegationStats {
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

function queryStatsSince(db: DatabaseHandle, soulId: number, sinceMs: number): DelegationStats {
  const row = db.prepare(DELEGATION_STATS_SQL).get(soulId, sinceMs) as Record<string, number>;
  return rowToStats(row);
}

export function queryWindowedStats(
  db: DatabaseHandle,
  soulId: number,
  lastTraitChangeAt: number | null,
): WindowedStats[] {
  const now = Date.now();
  const windows: WindowedStats[] = [
    { window: "7d", stats: queryStatsSince(db, soulId, now - 7 * DAY_MS) },
    { window: "30d", stats: queryStatsSince(db, soulId, now - 30 * DAY_MS) },
  ];
  if (lastTraitChangeAt !== null) {
    windows.push({
      window: "since_last_trait_change",
      stats: queryStatsSince(db, soulId, lastTraitChangeAt),
    });
  }
  return windows;
}

export function queryTraitFitness(
  db: DatabaseHandle,
  soulId: number,
  activeTraits: TraitSnapshot[],
): TraitFitness[] {
  return activeTraits.map((t) => ({
    traitId: t.id,
    principle: t.principle,
    addedAt: t.createdAt,
    statsSinceAdded: queryStatsSince(db, soulId, t.createdAt),
  }));
}

export function queryCostTrend(db: DatabaseHandle, soulId: number): CostTrend {
  const now = Date.now();
  const recent = db
    .prepare(
      `SELECT COALESCE(AVG(cost_usd), 0) AS avg
       FROM sessions
       WHERE purpose = 'delegate' AND soul_id = ? AND created_at >= ?`,
    )
    .get(soulId, now - 7 * DAY_MS) as { avg: number };

  const previous = db
    .prepare(
      `SELECT COALESCE(AVG(cost_usd), 0) AS avg
       FROM sessions
       WHERE purpose = 'delegate' AND soul_id = ?
         AND created_at >= ? AND created_at < ?`,
    )
    .get(soulId, now - 14 * DAY_MS, now - 7 * DAY_MS) as { avg: number };

  const r = recent.avg;
  const p = previous.avg;
  const threshold = 0.001;
  let direction: CostTrend["direction"] = "stable";
  if (p > threshold && r < p * 0.9) direction = "cheaper";
  else if (p > threshold && r > p * 1.1) direction = "costlier";
  else if (p <= threshold && r > threshold) direction = "costlier";

  return { recent7d: r, previous7d: p, direction };
}
