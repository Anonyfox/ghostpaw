import type { SweepState } from "./types.ts";

export function rowToSweepState(row: Record<string, unknown>): SweepState {
  return {
    id: row.id as number,
    lastSweepAt: row.last_sweep_at as number,
    updatedAt: row.updated_at as number,
  };
}
