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

  if (input.storylineId !== undefined) {
    const log = db.prepare("SELECT id FROM storylines WHERE id = ?").get(input.storylineId);
    if (!log) {
      throw new Error(`Storyline #${input.storylineId} does not exist.`);
    }
  }

  const now = Date.now();
  let position: number | null = input.position ?? null;
  if (input.storylineId && position == null) {
    const maxRow = db
      .prepare("SELECT COALESCE(MAX(position), 0) AS max_pos FROM quests WHERE storyline_id = ?")
      .get(input.storylineId) as { max_pos: number };
    position = maxRow.max_pos + 1000;
  }

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO quests
        (title, description, status, priority, storyline_id, tags, created_at, created_by,
         updated_at, starts_at, ends_at, due_at, remind_at, rrule, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      input.description?.trim() ?? null,
      input.status ?? "accepted",
      input.priority ?? "normal",
      input.storylineId ?? null,
      input.tags?.trim() ?? null,
      now,
      input.createdBy ?? "human",
      now,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.dueAt ?? null,
      input.remindAt ?? null,
      input.rrule?.trim() ?? null,
      position,
    );

  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(lastInsertRowid);
  return rowToQuest(row as Record<string, unknown>);
}
