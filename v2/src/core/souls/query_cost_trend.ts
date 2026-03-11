import type { DatabaseHandle } from "../../lib/index.ts";
import { getAverageDelegationCostBetween } from "../chat/api/read/index.ts";

export interface CostTrend {
  recent7d: number;
  previous7d: number;
  direction: "cheaper" | "stable" | "costlier";
}

const DAY_MS = 86_400_000;

export function queryCostTrend(db: DatabaseHandle, soulId: number): CostTrend {
  const now = Date.now();
  const r = getAverageDelegationCostBetween(db, soulId, now - 7 * DAY_MS);
  const p = getAverageDelegationCostBetween(db, soulId, now - 14 * DAY_MS, now - 7 * DAY_MS);
  const threshold = 0.001;
  let direction: CostTrend["direction"] = "stable";
  if (p > threshold && r < p * 0.9) direction = "cheaper";
  else if (p > threshold && r > p * 1.1) direction = "costlier";
  else if (p <= threshold && r > threshold) direction = "costlier";

  return { recent7d: r, previous7d: p, direction };
}
