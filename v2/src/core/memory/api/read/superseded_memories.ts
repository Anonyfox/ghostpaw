import type { DatabaseHandle } from "../../../../lib/index.ts";
import { rowToMemory } from "../../row_to_memory.ts";
import type { Memory } from "../../types.ts";

export function listSupersededMemories(db: DatabaseHandle, id: number): Memory[] {
  const rows = db
    .prepare("SELECT * FROM memories WHERE superseded_by = ? AND id != ? ORDER BY created_at ASC")
    .all(id, id) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}
