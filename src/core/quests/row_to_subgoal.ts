import type { Subgoal } from "./types.ts";

export function rowToSubgoal(row: Record<string, unknown>): Subgoal {
  return {
    id: row.id as number,
    questId: row.quest_id as number,
    text: row.text as string,
    done: (row.done as number) === 1,
    position: row.position as number,
    createdAt: row.created_at as number,
    doneAt: (row.done_at as number) ?? null,
  };
}
