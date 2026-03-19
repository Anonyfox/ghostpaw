import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Momentum, TrailChapter, Trailmark, TrailmarkKind } from "../../internal/index.ts";
import { rowToChapter, rowToTrailmark } from "../../internal/index.ts";

export interface CreateChapterInput {
  label: string;
  description?: string | null;
  momentum?: Momentum;
  confidence?: number;
}

export interface UpdateChapterInput {
  id: number;
  momentum?: Momentum;
  confidence?: number;
  endedAt?: number;
}

export interface CreateTrailmarkInput {
  chronicleId?: number | null;
  chapterId?: number | null;
  kind: TrailmarkKind;
  description: string;
  significance?: number;
}

export interface UpdateTrailStateInput {
  createChapter?: CreateChapterInput;
  updateChapter?: UpdateChapterInput;
  trailmarks?: CreateTrailmarkInput[];
}

export interface TrailStateResult {
  chapter: TrailChapter | null;
  trailmarks: Trailmark[];
}

export function updateTrailState(
  db: DatabaseHandle,
  input: UpdateTrailStateInput,
): TrailStateResult {
  const now = Date.now();
  let chapter: TrailChapter | null = null;
  const trailmarks: Trailmark[] = [];

  db.exec("BEGIN");
  try {
    chapter = insertChapter(db, input, now) ?? patchChapter(db, input, now);
    insertTrailmarks(db, input, now, trailmarks);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return { chapter, trailmarks };
}

function insertChapter(
  db: DatabaseHandle,
  input: UpdateTrailStateInput,
  now: number,
): TrailChapter | null {
  if (!input.createChapter) return null;
  const c = input.createChapter;
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO trail_chapters (label, description, started_at, momentum, confidence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      c.label,
      c.description ?? null,
      now,
      c.momentum ?? "stable",
      c.confidence ?? 0.5,
      now,
      now,
    );
  const row = db.prepare("SELECT * FROM trail_chapters WHERE id = ?").get(lastInsertRowid);
  return rowToChapter(row as Record<string, unknown>);
}

function patchChapter(
  db: DatabaseHandle,
  input: UpdateTrailStateInput,
  now: number,
): TrailChapter | null {
  if (!input.updateChapter) return null;
  const u = input.updateChapter;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (u.momentum !== undefined) {
    sets.push("momentum = ?");
    params.push(u.momentum);
  }
  if (u.confidence !== undefined) {
    sets.push("confidence = ?");
    params.push(u.confidence);
  }
  if (u.endedAt !== undefined) {
    sets.push("ended_at = ?");
    params.push(u.endedAt);
  }
  if (sets.length === 0) return null;
  sets.push("updated_at = ?");
  params.push(now, u.id);
  db.prepare(`UPDATE trail_chapters SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  const row = db.prepare("SELECT * FROM trail_chapters WHERE id = ?").get(u.id);
  return row ? rowToChapter(row as Record<string, unknown>) : null;
}

function insertTrailmarks(
  db: DatabaseHandle,
  input: UpdateTrailStateInput,
  now: number,
  results: Trailmark[],
): void {
  if (!input.trailmarks) return;
  const stmt = db.prepare(
    `INSERT INTO trail_trailmarks (chronicle_id, chapter_id, kind, description, significance, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const t of input.trailmarks) {
    const { lastInsertRowid } = stmt.run(
      t.chronicleId ?? null,
      t.chapterId ?? null,
      t.kind,
      t.description,
      t.significance ?? 0.5,
      now,
    );
    const row = db.prepare("SELECT * FROM trail_trailmarks WHERE id = ?").get(lastInsertRowid);
    results.push(rowToTrailmark(row as Record<string, unknown>));
  }
}
