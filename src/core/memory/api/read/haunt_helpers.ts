import type { DatabaseHandle } from "../../../../lib/index.ts";
import { rowToMemory } from "../../row_to_memory.ts";
import type { Memory, MemoryCategory } from "../../types.ts";

export interface MemoryCategoryConfidence {
  category: MemoryCategory;
  count: number;
  avgConfidence: number;
}

export function randomUnconfirmedExplicitMemoryBefore(
  db: DatabaseHandle,
  beforeMs: number,
): Memory | null {
  const row = db
    .prepare(
      `SELECT * FROM memories
       WHERE superseded_by IS NULL
         AND source = 'explicit'
         AND evidence_count = 1
         AND verified_at < ?
       ORDER BY RANDOM()
       LIMIT 1`,
    )
    .get(beforeMs) as Record<string, unknown> | undefined;
  return row ? rowToMemory(row) : null;
}

export function memoryCategoryConfidences(db: DatabaseHandle): MemoryCategoryConfidence[] {
  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS cnt, COALESCE(AVG(confidence), 0) AS avg_conf
       FROM memories
       WHERE superseded_by IS NULL
       GROUP BY category`,
    )
    .all() as Array<{ category: MemoryCategory; cnt: number; avg_conf: number }>;

  return rows.map((row) => ({
    category: row.category,
    count: row.cnt,
    avgConfidence: row.avg_conf,
  }));
}
