import type { DatabaseHandle } from "../../lib/index.ts";

export interface CostTrend {
  recent7d: number;
  previous7d: number;
  direction: "cheaper" | "stable" | "costlier";
}

const DAY_MS = 86_400_000;

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
