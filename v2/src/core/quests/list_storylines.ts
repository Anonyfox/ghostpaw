import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToStoryline } from "./row_to_storyline.ts";
import type { ListStorylinesOptions, Storyline } from "./types.ts";

export function listStorylines(
  db: DatabaseHandle,
  options: ListStorylinesOptions = {},
): Storyline[] {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (options.status) {
    clauses.push("status = ?");
    values.push(options.status);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(`SELECT * FROM storylines ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...values, limit, offset) as Record<string, unknown>[];

  return rows.map(rowToStoryline);
}
