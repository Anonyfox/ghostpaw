import { type DatabaseHandle, isNullRow } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

export function getMemory(db: DatabaseHandle, id: number): Memory | null {
  const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
  if (isNullRow(row)) return null;
  return rowToMemory(row);
}
