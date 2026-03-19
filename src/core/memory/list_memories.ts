import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { ListOptions, Memory } from "./types.ts";

export function listMemories(db: DatabaseHandle, options?: ListOptions): Memory[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (!options?.includeSuperseded) {
    clauses.push("superseded_by IS NULL");
  }
  if (options?.category) {
    clauses.push("category = ?");
    params.push(options.category);
  }
  if (options?.minConfidence !== undefined) {
    clauses.push("confidence >= ?");
    params.push(options.minConfidence);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(0, Math.trunc(options?.limit ?? 100));
  const offset = Math.max(0, Math.trunc(options?.offset ?? 0));

  const sql = `SELECT * FROM memories ${where} ORDER BY verified_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params);
  return rows.map((row) => rowToMemory(row));
}
