import type { DatabaseHandle } from "../../lib/index.ts";
import type { HauntSummary } from "./types.ts";

export function searchHaunts(db: DatabaseHandle, query: string, limit = 10): HauntSummary[] {
  const pattern = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT id, summary, created_at FROM haunts
       WHERE summary LIKE ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(pattern, limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    summary: row.summary as string,
    createdAt: row.created_at as number,
  }));
}
