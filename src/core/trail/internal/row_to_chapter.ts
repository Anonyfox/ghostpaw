import type { Momentum, TrailChapter } from "./types.ts";

export function rowToChapter(row: Record<string, unknown>): TrailChapter {
  return {
    id: row.id as number,
    label: row.label as string,
    description: (row.description as string | null) ?? null,
    startedAt: row.started_at as number,
    endedAt: (row.ended_at as number | null) ?? null,
    momentum: row.momentum as Momentum,
    confidence: row.confidence as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
