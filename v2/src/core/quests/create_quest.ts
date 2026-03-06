import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { CreateQuestInput, Quest } from "./types.ts";
import { QUEST_PRIORITIES, QUEST_STATUSES } from "./types.ts";

export function createQuest(db: DatabaseHandle, input: CreateQuestInput): Quest {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Quest title is required and cannot be empty.");
  }

  if (input.status && !QUEST_STATUSES.includes(input.status)) {
    throw new Error(
      `Invalid status "${input.status}". Must be one of: ${QUEST_STATUSES.join(", ")}.`,
    );
  }

  if (input.priority && !QUEST_PRIORITIES.includes(input.priority)) {
    throw new Error(
      `Invalid priority "${input.priority}". Must be one of: ${QUEST_PRIORITIES.join(", ")}.`,
    );
  }

  if (input.questLogId !== undefined) {
    const log = db
      .prepare("SELECT id FROM quest_logs WHERE id = ?")
      .get(input.questLogId);
    if (!log) {
      throw new Error(`Quest log #${input.questLogId} does not exist.`);
    }
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO quests
        (title, description, status, priority, quest_log_id, tags, created_at, created_by,
         updated_at, starts_at, ends_at, due_at, remind_at, rrule)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      input.description?.trim() ?? null,
      input.status ?? "pending",
      input.priority ?? "normal",
      input.questLogId ?? null,
      input.tags?.trim() ?? null,
      now,
      input.createdBy ?? "human",
      now,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.dueAt ?? null,
      input.remindAt ?? null,
      input.rrule?.trim() ?? null,
    );

  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(lastInsertRowid);
  return rowToQuest(row as Record<string, unknown>);
}
