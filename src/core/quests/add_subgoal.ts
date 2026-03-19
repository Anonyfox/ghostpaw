import type { DatabaseHandle } from "../../lib/index.ts";
import type { Subgoal } from "./types.ts";

export function addSubgoal(
  db: DatabaseHandle,
  questId: number,
  text: string,
  position?: number,
): Subgoal {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Subgoal text is required");

  const now = Date.now();
  const pos =
    position ??
    (
      db
        .prepare(
          "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM quest_subgoals WHERE quest_id = ?",
        )
        .get(questId) as Record<string, number>
    ).next;

  const result = db
    .prepare(
      `INSERT INTO quest_subgoals (quest_id, text, position, created_at) VALUES (?, ?, ?, ?)`,
    )
    .run(questId, trimmed, pos, now);

  return {
    id: Number(result.lastInsertRowid),
    questId,
    text: trimmed,
    done: false,
    position: pos,
    createdAt: now,
    doneAt: null,
  };
}
