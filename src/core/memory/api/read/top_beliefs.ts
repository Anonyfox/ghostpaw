import type { DatabaseHandle } from "../../../../lib/index.ts";
import { rowToMemory } from "../../row_to_memory.ts";
import type { Memory } from "../../types.ts";

const DEFAULT_LIMIT = 5;
const MIN_CONFIDENCE = 0.7;

export function topBeliefs(db: DatabaseHandle, limit?: number): Memory[] {
  const cap = Math.max(1, Math.trunc(limit ?? DEFAULT_LIMIT));
  const rows = db
    .prepare(
      `SELECT * FROM memories
       WHERE superseded_by IS NULL AND confidence >= ?
       ORDER BY evidence_count DESC, verified_at DESC
       LIMIT ?`,
    )
    .all(MIN_CONFIDENCE, cap);
  return rows.map((row) => rowToMemory(row as Record<string, unknown>));
}
