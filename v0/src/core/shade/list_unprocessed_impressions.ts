import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { ShadeImpression } from "./types.ts";

export function listUnprocessedImpressions(
  db: DatabaseHandle,
  processor: string,
  limit = 50,
): ShadeImpression[] {
  return db
    .prepare(
      `SELECT si.* FROM shade_impressions si
       WHERE si.impression_count > 0
         AND NOT EXISTS (
           SELECT 1 FROM shade_runs sr
           WHERE sr.impression_id = si.id AND sr.processor = ? AND sr.status = 'done'
         )
       ORDER BY si.created_at ASC
       LIMIT ?`,
    )
    .all(processor, limit) as unknown as ShadeImpression[];
}
