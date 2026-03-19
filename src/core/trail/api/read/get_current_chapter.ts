import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailChapter } from "../../internal/index.ts";
import { rowToChapter } from "../../internal/index.ts";

export function getCurrentChapter(db: DatabaseHandle): TrailChapter | null {
  const row = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  return row ? rowToChapter(row) : null;
}
