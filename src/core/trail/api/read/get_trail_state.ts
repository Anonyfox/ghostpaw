import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Momentum, TrailChapter, Trailmark } from "../../internal/index.ts";
import { rowToChapter, rowToTrailmark } from "../../internal/index.ts";

export interface TrailState {
  chapter: TrailChapter | null;
  recentTrailmarks: Trailmark[];
  momentum: Momentum;
}

export function getTrailState(db: DatabaseHandle): TrailState {
  const chapterRow = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  const chapter = chapterRow ? rowToChapter(chapterRow) : null;

  const markRows = db
    .prepare("SELECT * FROM trail_trailmarks ORDER BY created_at DESC LIMIT 10")
    .all() as Record<string, unknown>[];
  const recentTrailmarks = markRows.map(rowToTrailmark);

  return {
    chapter,
    recentTrailmarks,
    momentum: chapter?.momentum ?? "stable",
  };
}
