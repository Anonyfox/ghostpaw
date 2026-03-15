import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Omen, OpenLoop, TrailChapter } from "../../internal/index.ts";
import { rowToChapter, rowToOmen, rowToOpenLoop } from "../../internal/index.ts";

export interface SessionBriefing {
  chapter: TrailChapter | null;
  openLoops: OpenLoop[];
  unresolvedOmens: Omen[];
}

export function getSessionBriefing(db: DatabaseHandle): SessionBriefing {
  const chapterRow = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  const chapter = chapterRow ? rowToChapter(chapterRow) : null;

  const loopRows = db
    .prepare(
      "SELECT * FROM trail_open_loops WHERE status = 'alive' ORDER BY significance DESC LIMIT 7",
    )
    .all() as Record<string, unknown>[];
  const openLoops = loopRows.map(rowToOpenLoop);

  const omenRows = db
    .prepare("SELECT * FROM trail_omens WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 5")
    .all() as Record<string, unknown>[];
  const unresolvedOmens = omenRows.map(rowToOmen);

  return { chapter, openLoops, unresolvedOmens };
}
