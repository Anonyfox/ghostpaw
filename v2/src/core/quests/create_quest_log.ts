import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuestLog } from "./row_to_quest_log.ts";
import type { CreateQuestLogInput, QuestLog } from "./types.ts";

export function createQuestLog(db: DatabaseHandle, input: CreateQuestLogInput): QuestLog {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Quest log title is required and cannot be empty.");
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO quest_logs (title, description, created_at, created_by, updated_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      input.description?.trim() ?? null,
      now,
      input.createdBy ?? "human",
      now,
      input.dueAt ?? null,
    );

  const row = db.prepare("SELECT * FROM quest_logs WHERE id = ?").get(lastInsertRowid);
  return rowToQuestLog(row as Record<string, unknown>);
}
