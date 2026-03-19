import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSubgoal } from "./row_to_subgoal.ts";
import type { Subgoal } from "./types.ts";

export function completeSubgoal(db: DatabaseHandle, id: number): Subgoal {
  const row = db.prepare("SELECT * FROM quest_subgoals WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new Error(`Subgoal ${id} not found`);

  const existing = rowToSubgoal(row);
  if (existing.done) throw new Error(`Subgoal ${id} is already done`);

  const now = Date.now();
  db.prepare("UPDATE quest_subgoals SET done = 1, done_at = ? WHERE id = ?").run(now, id);

  return { ...existing, done: true, doneAt: now };
}
