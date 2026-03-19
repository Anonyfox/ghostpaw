import type { TrailChronicle } from "./types.ts";

export function rowToChronicle(row: Record<string, unknown>): TrailChronicle {
  return {
    id: row.id as number,
    date: row.date as string,
    title: row.title as string,
    chapterId: (row.chapter_id as number | null) ?? null,
    narrative: row.narrative as string,
    highlights: (row.highlights as string | null) ?? null,
    surprises: (row.surprises as string | null) ?? null,
    unresolved: (row.unresolved as string | null) ?? null,
    sourceSlices: (row.source_slices as string | null) ?? null,
    createdAt: row.created_at as number,
  };
}
