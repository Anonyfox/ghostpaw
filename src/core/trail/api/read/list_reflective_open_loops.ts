import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

export function listReflectiveOpenLoops(db: DatabaseHandle): OpenLoop[] {
  const rows = db
    .prepare(
      `SELECT * FROM trail_open_loops
       WHERE status = 'alive'
         AND significance >= 0.4
         AND recommended_action IN ('ask', 'revisit', 'remind')
       ORDER BY significance DESC
       LIMIT 5`,
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToOpenLoop);
}
