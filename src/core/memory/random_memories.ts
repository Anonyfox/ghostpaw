import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory, MemoryCategory } from "./types.ts";

export interface RandomMemoriesOptions {
  category: MemoryCategory;
  limit: number;
  minConfidence: number;
  excludeTopic?: string | null;
}

export function randomMemories(db: DatabaseHandle, opts: RandomMemoriesOptions): Memory[] {
  const clauses = ["superseded_by IS NULL", "category = ?", "confidence >= ?"];
  const params: unknown[] = [opts.category, opts.minConfidence];

  if (opts.excludeTopic) {
    clauses.push("LOWER(claim) NOT LIKE ?");
    params.push(`%${opts.excludeTopic.toLowerCase()}%`);
  }

  params.push(opts.limit);
  const sql = `SELECT * FROM memories WHERE ${clauses.join(" AND ")} ORDER BY RANDOM() LIMIT ?`;
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}
