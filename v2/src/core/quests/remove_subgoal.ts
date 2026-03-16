import type { DatabaseHandle } from "../../lib/index.ts";

export function removeSubgoal(db: DatabaseHandle, id: number): void {
  const result = db.prepare("DELETE FROM quest_subgoals WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error(`Subgoal ${id} not found`);
}
