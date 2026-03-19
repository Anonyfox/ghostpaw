import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailChronicle } from "../../internal/index.ts";
import { rowToChronicle } from "../../internal/index.ts";

export interface WriteChronicleInput {
  date: string;
  title: string;
  chapterId?: number | null;
  narrative: string;
  highlights?: string | null;
  surprises?: string | null;
  unresolved?: string | null;
  sourceSlices?: string | null;
}

export function writeChronicle(db: DatabaseHandle, input: WriteChronicleInput): TrailChronicle {
  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO trail_chronicle (date, title, chapter_id, narrative, highlights, surprises, unresolved, source_slices, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.date,
      input.title,
      input.chapterId ?? null,
      input.narrative,
      input.highlights ?? null,
      input.surprises ?? null,
      input.unresolved ?? null,
      input.sourceSlices ?? null,
      now,
    );
  const row = db.prepare("SELECT * FROM trail_chronicle WHERE id = ?").get(lastInsertRowid);
  return rowToChronicle(row as Record<string, unknown>);
}
