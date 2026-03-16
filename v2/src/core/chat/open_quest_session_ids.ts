import type { DatabaseHandle } from "../../lib/index.ts";

/** Returns quest IDs that currently have an open (unclosed) session. */
export function openQuestSessionIds(db: DatabaseHandle): Set<number> {
  const rows = db
    .prepare(
      "SELECT DISTINCT quest_id FROM sessions WHERE quest_id IS NOT NULL AND closed_at IS NULL",
    )
    .all() as { quest_id: number }[];
  return new Set(rows.map((r) => r.quest_id));
}
