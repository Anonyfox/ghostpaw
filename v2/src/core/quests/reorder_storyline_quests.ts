import type { DatabaseHandle } from "../../lib/index.ts";

export function reorderStorylineQuests(
  db: DatabaseHandle,
  storylineId: number,
  orderedQuestIds: number[],
): void {
  const existing = db.prepare("SELECT id FROM quests WHERE storyline_id = ?").all(storylineId) as {
    id: number;
  }[];

  const existingSet = new Set(existing.map((r) => r.id));
  for (const id of orderedQuestIds) {
    if (!existingSet.has(id)) {
      throw new Error(`Quest ${id} does not belong to storyline ${storylineId}`);
    }
  }

  db.exec("BEGIN");
  try {
    const stmt = db.prepare("UPDATE quests SET position = ? WHERE id = ?");
    for (let i = 0; i < orderedQuestIds.length; i++) {
      stmt.run((i + 1) * 1000, orderedQuestIds[i]);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
