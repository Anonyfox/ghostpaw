import type { DatabaseHandle } from "../../lib/index.ts";
import type { CostByPurpose } from "./cost_types.ts";

export function getCostByPurpose(db: DatabaseHandle, sinceMs: number): CostByPurpose[] {
  return db
    .prepare(
      `SELECT purpose,
        SUM(cost_usd) AS costUsd,
        COUNT(*) AS sessionCount
      FROM sessions
      WHERE last_active_at >= ? AND cost_usd > 0
      GROUP BY purpose
      ORDER BY costUsd DESC`,
    )
    .all(sinceMs) as unknown as CostByPurpose[];
}
