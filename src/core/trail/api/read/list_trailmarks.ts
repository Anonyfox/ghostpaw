import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Trailmark } from "../../internal/index.ts";
import { rowToTrailmark } from "../../internal/index.ts";

export function listTrailmarks(db: DatabaseHandle, limit?: number): Trailmark[] {
  const rows = db
    .prepare("SELECT * FROM trail_trailmarks ORDER BY created_at DESC LIMIT ?")
    .all(limit ?? 20) as Record<string, unknown>[];
  return rows.map(rowToTrailmark);
}
