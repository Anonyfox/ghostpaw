import type { DatabaseHandle } from "../../../../lib/index.ts";

export function countMemoriesMatchingText(db: DatabaseHandle, text: string): number {
  const term = `%${text}%`;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM memories
       WHERE superseded_by IS NULL
         AND (claim LIKE ? OR source LIKE ?)`,
    )
    .get(term, term) as { c: number };
  return row.c;
}
