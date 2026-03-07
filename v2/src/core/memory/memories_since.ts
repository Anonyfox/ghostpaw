import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

export function memoriesSince(db: DatabaseHandle, since: number, limit = 3): Memory[] {
  const rows = db
    .prepare(
      `SELECT * FROM memories
       WHERE superseded_by IS NULL AND created_at >= ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(since, limit) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}
