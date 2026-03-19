import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

export function getHauntSeeds(db: DatabaseHandle): OpenLoop[] {
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT * FROM trail_open_loops
       WHERE status = 'alive'
         AND significance >= 0.5
         AND (earliest_resurface IS NULL OR earliest_resurface <= ?)
       ORDER BY significance DESC
       LIMIT 5`,
    )
    .all(now) as Record<string, unknown>[];
  return rows.map(rowToOpenLoop);
}
