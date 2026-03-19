import type { DatabaseHandle } from "../../../../lib/index.ts";
import type {
  Momentum,
  PairingWisdom,
  TrailChapter,
  TrailChronicle,
} from "../../internal/index.ts";
import { rowToChapter, rowToChronicle, rowToWisdom } from "../../internal/index.ts";

export interface PairHistorySummary {
  chapter: TrailChapter | null;
  momentum: Momentum;
  latestChronicle: TrailChronicle | null;
  topWisdom: PairingWisdom[];
  activeLoopCount: number;
}

export function getPairHistorySummary(db: DatabaseHandle): PairHistorySummary {
  const chapterRow = db
    .prepare("SELECT * FROM trail_chapters WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  const chapter = chapterRow ? rowToChapter(chapterRow) : null;

  const chronicleRow = db.prepare("SELECT * FROM trail_chronicle ORDER BY id DESC LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
  const latestChronicle = chronicleRow ? rowToChronicle(chronicleRow) : null;

  const wisdomRows = db
    .prepare(
      "SELECT * FROM trail_pairing_wisdom WHERE confidence >= 0.4 ORDER BY confidence DESC LIMIT 5",
    )
    .all() as Record<string, unknown>[];

  const loopCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM trail_open_loops WHERE status IN ('alive', 'dormant')")
      .get() as { c: number }
  ).c;

  return {
    chapter,
    momentum: chapter?.momentum ?? "stable",
    latestChronicle,
    topWisdom: wisdomRows.map(rowToWisdom),
    activeLoopCount: loopCount,
  };
}
