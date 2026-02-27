import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

const DEFAULT_LIMIT = 10;

/**
 * Finds active memories that are most likely stale: high evidence count
 * but long since last verified. Sorted by `evidence_count * age_ms` DESC
 * so the "once-confident but forgotten" ones surface first.
 */
export function staleMemories(db: DatabaseHandle, limit: number = DEFAULT_LIMIT): Memory[] {
  const now = Date.now();
  const rows = db
    .prepare(
      `SELECT * FROM memories
       WHERE superseded_by IS NULL
       ORDER BY evidence_count * (CAST(? AS REAL) - verified_at) DESC
       LIMIT ?`,
    )
    .all(now, limit);
  return rows.map((row) => rowToMemory(row));
}
