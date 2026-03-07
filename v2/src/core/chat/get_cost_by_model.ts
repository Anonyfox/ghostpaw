import type { DatabaseHandle } from "../../lib/index.ts";
import type { CostByModel } from "./cost_types.ts";

export function getCostByModel(db: DatabaseHandle, sinceMs: number): CostByModel[] {
  return db
    .prepare(
      `SELECT model,
        SUM(cost_usd) AS costUsd,
        SUM(tokens_in + tokens_out) AS tokens,
        COUNT(*) AS calls
      FROM sessions
      WHERE last_active_at >= ? AND cost_usd > 0 AND model IS NOT NULL
      GROUP BY model
      ORDER BY costUsd DESC`,
    )
    .all(sinceMs) as unknown as CostByModel[];
}
