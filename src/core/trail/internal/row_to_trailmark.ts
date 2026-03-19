import type { Trailmark, TrailmarkKind } from "./types.ts";

export function rowToTrailmark(row: Record<string, unknown>): Trailmark {
  return {
    id: row.id as number,
    chronicleId: (row.chronicle_id as number | null) ?? null,
    chapterId: (row.chapter_id as number | null) ?? null,
    kind: row.kind as TrailmarkKind,
    description: row.description as string,
    significance: row.significance as number,
    createdAt: row.created_at as number,
  };
}
