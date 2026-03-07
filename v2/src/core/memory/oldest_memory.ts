import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

export function oldestMemory(db: DatabaseHandle): Memory | null {
  const row = db
    .prepare("SELECT * FROM memories WHERE superseded_by IS NULL ORDER BY created_at ASC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToMemory(row);
}
