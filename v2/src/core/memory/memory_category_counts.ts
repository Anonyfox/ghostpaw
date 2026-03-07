import type { DatabaseHandle } from "../../lib/index.ts";
import type { MemoryCategory } from "./types.ts";

export interface CategoryCount {
  category: MemoryCategory;
  count: number;
}

export function memoryCategoryCounts(db: DatabaseHandle): CategoryCount[] {
  const rows = db
    .prepare(
      `SELECT category, COUNT(*) AS cnt FROM memories
       WHERE superseded_by IS NULL
       GROUP BY category
       HAVING cnt > 0
       ORDER BY cnt DESC`,
    )
    .all() as Array<{ category: string; cnt: number }>;
  return rows.map((r) => ({ category: r.category as MemoryCategory, count: r.cnt }));
}
