import type { LoopAction, LoopCategory, LoopStatus, OpenLoop } from "./types.ts";

export function rowToOpenLoop(row: Record<string, unknown>): OpenLoop {
  return {
    id: row.id as number,
    description: row.description as string,
    category: ((row.category as string | null) ?? "organic") as LoopCategory,
    sourceType: (row.source_type as string | null) ?? null,
    sourceId: (row.source_id as string | null) ?? null,
    significance: row.significance as number,
    status: row.status as LoopStatus,
    recommendedAction: (row.recommended_action as LoopAction | null) ?? null,
    earliestResurface: (row.earliest_resurface as number | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
