import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToOccurrence } from "./row_to_occurrence.ts";
import type { QuestOccurrence } from "./types.ts";

export function skipOccurrence(
  db: DatabaseHandle,
  questId: number,
  occurrenceAt: number,
): QuestOccurrence {
  const quest = db.prepare("SELECT id, rrule FROM quests WHERE id = ?").get(questId) as
    | Record<string, unknown>
    | undefined;
  if (!quest) {
    throw new Error(`Quest #${questId} not found.`);
  }
  if (!quest.rrule) {
    throw new Error(`Quest #${questId} is not recurring.`);
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO quest_occurrences (quest_id, occurrence_at, status, completed_at)
       VALUES (?, ?, 'skipped', ?)`,
    )
    .run(questId, occurrenceAt, now);

  const row = db
    .prepare("SELECT * FROM quest_occurrences WHERE id = ?")
    .get(lastInsertRowid);
  return rowToOccurrence(row as Record<string, unknown>);
}
