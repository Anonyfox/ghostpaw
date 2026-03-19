import type { DatabaseHandle } from "../../lib/index.ts";
import type { CostBySoul } from "./cost_types.ts";

export function getCostBySoul(db: DatabaseHandle, sinceMs: number): CostBySoul[] {
  const rows = db
    .prepare(
      `SELECT COALESCE(so.name, 'unknown') AS soul,
        SUM(s.cost_usd) AS costUsd,
        COUNT(*) AS runs
      FROM sessions s
      LEFT JOIN souls so ON s.soul_id = so.id
      WHERE s.purpose = 'delegate' AND s.last_active_at >= ? AND s.cost_usd > 0
      GROUP BY s.soul_id
      ORDER BY costUsd DESC`,
    )
    .all(sinceMs) as { soul: string; costUsd: number; runs: number }[];

  return rows.map((r) => ({
    soul: r.soul,
    costUsd: r.costUsd,
    runs: r.runs,
    avgCostUsd: r.runs > 0 ? r.costUsd / r.runs : 0,
  }));
}
