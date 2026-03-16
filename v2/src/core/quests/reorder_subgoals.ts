import type { DatabaseHandle } from "../../lib/index.ts";

export function reorderSubgoals(db: DatabaseHandle, questId: number, orderedIds: number[]): void {
  const existing = db.prepare("SELECT id FROM quest_subgoals WHERE quest_id = ?").all(questId) as {
    id: number;
  }[];

  const existingSet = new Set(existing.map((r) => r.id));
  for (const id of orderedIds) {
    if (!existingSet.has(id)) throw new Error(`Subgoal ${id} does not belong to quest ${questId}`);
  }

  db.exec("BEGIN");
  try {
    const stmt = db.prepare("UPDATE quest_subgoals SET position = ? WHERE id = ?");
    for (let i = 0; i < orderedIds.length; i++) {
      stmt.run(i, orderedIds[i]);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
