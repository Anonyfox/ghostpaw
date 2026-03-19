import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSubgoal } from "./row_to_subgoal.ts";
import type { Subgoal } from "./types.ts";

export function listSubgoals(db: DatabaseHandle, questId: number): Subgoal[] {
  const rows = db
    .prepare("SELECT * FROM quest_subgoals WHERE quest_id = ? ORDER BY position ASC, id ASC")
    .all(questId) as Record<string, unknown>[];
  return rows.map(rowToSubgoal);
}
