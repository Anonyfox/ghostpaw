import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMemoryConfig } from "./resolve_config.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

/**
 * Memories in the "about to fade" freshness zone (0.3–0.6). These are optimal
 * targets for the testing effect: one retrieval at this point has maximum
 * retention impact per spaced repetition research.
 */
export function fadingMemories(db: DatabaseHandle, limit = 5): Memory[] {
  const now = Date.now();
  const halfLife = resolveMemoryConfig(db, "memory_half_life_days", undefined);

  const rows = db
    .prepare(
      `SELECT * FROM memories
       WHERE superseded_by IS NULL
         AND exp(-(CAST(? AS REAL) - verified_at) / (86400000.0 * ? * sqrt(CAST(evidence_count AS REAL))))
             BETWEEN 0.3 AND 0.6
       ORDER BY confidence DESC
       LIMIT ?`,
    )
    .all(now, halfLife, limit);

  return rows.map((row) => rowToMemory(row));
}
