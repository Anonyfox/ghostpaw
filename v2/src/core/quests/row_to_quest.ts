import type { Quest, QuestCreator, QuestPriority, QuestStatus } from "./types.ts";

export function rowToQuest(row: Record<string, unknown>): Quest {
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as QuestStatus,
    priority: row.priority as QuestPriority,
    questLogId: (row.quest_log_id as number) ?? null,
    tags: (row.tags as string) ?? null,
    createdAt: row.created_at as number,
    createdBy: row.created_by as QuestCreator,
    updatedAt: row.updated_at as number,
    startsAt: (row.starts_at as number) ?? null,
    endsAt: (row.ends_at as number) ?? null,
    dueAt: (row.due_at as number) ?? null,
    remindAt: (row.remind_at as number) ?? null,
    remindedAt: (row.reminded_at as number) ?? null,
    completedAt: (row.completed_at as number) ?? null,
    rrule: (row.rrule as string) ?? null,
  };
}
