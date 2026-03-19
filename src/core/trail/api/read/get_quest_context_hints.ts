import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { OpenLoop, TrailChapter } from "../../internal/index.ts";
import { rowToChapter, rowToOpenLoop } from "../../internal/index.ts";

export interface QuestContextHints {
  chapter: TrailChapter | null;
  linkedLoops: OpenLoop[];
}

export function getQuestContextHints(db: DatabaseHandle, questId: number): QuestContextHints {
  const chapterRow = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  const chapter = chapterRow ? rowToChapter(chapterRow) : null;

  const loopRows = db
    .prepare(
      `SELECT * FROM trail_open_loops
       WHERE source_type = 'quest' AND source_id = ? AND status IN ('alive', 'dormant')
       ORDER BY significance DESC LIMIT 5`,
    )
    .all(String(questId)) as Record<string, unknown>[];

  return { chapter, linkedLoops: loopRows.map(rowToOpenLoop) };
}
