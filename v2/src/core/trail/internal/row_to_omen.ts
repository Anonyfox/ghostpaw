import type { Omen } from "./types.ts";

export function rowToOmen(row: Record<string, unknown>): Omen {
  return {
    id: row.id as number,
    forecast: row.forecast as string,
    confidence: row.confidence as number,
    horizon: (row.horizon as number | null) ?? null,
    resolvedAt: (row.resolved_at as number | null) ?? null,
    outcome: (row.outcome as string | null) ?? null,
    predictionError: (row.prediction_error as number | null) ?? null,
    createdAt: row.created_at as number,
  };
}
