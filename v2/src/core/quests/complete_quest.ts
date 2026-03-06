import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToOccurrence } from "./row_to_occurrence.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest, QuestOccurrence, QuestStatus } from "./types.ts";
import { TERMINAL_STATUSES } from "./types.ts";

/**
 * For non-recurring quests (or recurring without occurrenceAt): marks the
 * quest itself as done. For recurring quests with occurrenceAt: records an
 * occurrence completion without affecting the base quest.
 */
export function completeQuest(
  db: DatabaseHandle,
  id: number,
  occurrenceAt?: number,
): Quest | QuestOccurrence {
  const existing = db.prepare("SELECT * FROM quests WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error(`Quest #${id} not found.`);
  }

  if (occurrenceAt !== undefined) {
    if (!existing.rrule) {
      throw new Error(
        `Quest #${id} is not recurring — occurrence_at is not applicable.`,
      );
    }
    const now = Date.now();
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO quest_occurrences (quest_id, occurrence_at, status, completed_at)
         VALUES (?, ?, 'done', ?)`,
      )
      .run(id, occurrenceAt, now);

    const row = db
      .prepare("SELECT * FROM quest_occurrences WHERE id = ?")
      .get(lastInsertRowid);
    return rowToOccurrence(row as Record<string, unknown>);
  }

  if (TERMINAL_STATUSES.includes(existing.status as QuestStatus)) {
    throw new Error(
      `Quest #${id} is already in terminal state "${existing.status}".`,
    );
  }

  const now = Date.now();
  db.prepare(
    "UPDATE quests SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?",
  ).run(now, now, id);

  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(id);
  return rowToQuest(row as Record<string, unknown>);
}
