import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuestLog } from "./row_to_quest_log.ts";
import type { QuestLog, UpdateQuestLogInput } from "./types.ts";
import { QUEST_LOG_STATUSES } from "./types.ts";

export function updateQuestLog(
  db: DatabaseHandle,
  id: number,
  input: UpdateQuestLogInput,
): QuestLog {
  const existing = db.prepare("SELECT * FROM quest_logs WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error(`Quest log #${id} not found.`);
  }

  if (input.status !== undefined && !QUEST_LOG_STATUSES.includes(input.status)) {
    throw new Error(
      `Invalid status "${input.status}". Must be one of: ${QUEST_LOG_STATUSES.join(", ")}.`,
    );
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Quest log title cannot be empty.");
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  const field = (col: string, val: unknown) => {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      values.push(val);
    }
  };

  field("title", input.title?.trim());
  field("description", input.description === null ? null : input.description?.trim());
  field("status", input.status);
  field("due_at", input.dueAt);

  const now = Date.now();

  if (
    input.status === "completed" &&
    existing.status !== "completed"
  ) {
    sets.push("completed_at = ?");
    values.push(now);
  }

  if (sets.length === 0) {
    return rowToQuestLog(existing);
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE quest_logs SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  const row = db.prepare("SELECT * FROM quest_logs WHERE id = ?").get(id);
  return rowToQuestLog(row as Record<string, unknown>);
}
