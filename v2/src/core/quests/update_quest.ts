import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest, QuestStatus, UpdateQuestInput } from "./types.ts";
import { QUEST_PRIORITIES, QUEST_STATUSES, TERMINAL_STATUSES } from "./types.ts";

export function updateQuest(db: DatabaseHandle, id: number, input: UpdateQuestInput): Quest {
  const existing = db.prepare("SELECT * FROM quests WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error(`Quest #${id} not found.`);
  }

  if (input.status !== undefined && !QUEST_STATUSES.includes(input.status)) {
    throw new Error(
      `Invalid status "${input.status}". Must be one of: ${QUEST_STATUSES.join(", ")}.`,
    );
  }

  if (input.priority !== undefined && !QUEST_PRIORITIES.includes(input.priority)) {
    throw new Error(
      `Invalid priority "${input.priority}". Must be one of: ${QUEST_PRIORITIES.join(", ")}.`,
    );
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Quest title cannot be empty.");
  }

  if (input.storylineId !== undefined && input.storylineId !== null) {
    const log = db.prepare("SELECT id FROM storylines WHERE id = ?").get(input.storylineId);
    if (!log) {
      throw new Error(`Storyline #${input.storylineId} does not exist.`);
    }
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
  field("priority", input.priority);
  field("storyline_id", input.storylineId);
  field("tags", input.tags === null ? null : input.tags?.trim());
  field("starts_at", input.startsAt);
  field("ends_at", input.endsAt);
  field("due_at", input.dueAt);
  field("remind_at", input.remindAt);
  field("reminded_at", input.remindedAt);
  field("rrule", input.rrule === null ? null : input.rrule?.trim());

  const now = Date.now();
  if (
    input.status !== undefined &&
    TERMINAL_STATUSES.includes(input.status) &&
    !TERMINAL_STATUSES.includes(existing.status as QuestStatus)
  ) {
    sets.push("completed_at = ?");
    values.push(now);
  }

  if (sets.length === 0) {
    return rowToQuest(existing);
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE quests SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(id);
  return rowToQuest(row as Record<string, unknown>);
}
