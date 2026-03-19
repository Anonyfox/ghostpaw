import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToOccurrence } from "./row_to_occurrence.ts";
import type { QuestOccurrence } from "./types.ts";

export function listOccurrences(
  db: DatabaseHandle,
  questId: number,
  options: { since?: number; until?: number; limit?: number } = {},
): QuestOccurrence[] {
  const clauses = ["quest_id = ?"];
  const values: unknown[] = [questId];

  if (options.since !== undefined) {
    clauses.push("occurrence_at >= ?");
    values.push(options.since);
  }
  if (options.until !== undefined) {
    clauses.push("occurrence_at <= ?");
    values.push(options.until);
  }

  const limit = options.limit ?? 100;

  const rows = db
    .prepare(
      `SELECT * FROM quest_occurrences WHERE ${clauses.join(" AND ")} ORDER BY occurrence_at DESC LIMIT ?`,
    )
    .all(...values, limit) as Record<string, unknown>[];

  return rows.map(rowToOccurrence);
}
