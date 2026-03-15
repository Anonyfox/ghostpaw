import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailChronicle } from "../../internal/index.ts";
import { rowToChronicle } from "../../internal/index.ts";

export function getLatestChronicle(db: DatabaseHandle): TrailChronicle | null {
  const row = db
    .prepare("SELECT * FROM trail_chronicle ORDER BY created_at DESC, id DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  return row ? rowToChronicle(row) : null;
}
