import type { QuestCreator, QuestLog, QuestLogStatus } from "./types.ts";

export function rowToQuestLog(row: Record<string, unknown>): QuestLog {
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as QuestLogStatus,
    createdAt: row.created_at as number,
    createdBy: row.created_by as QuestCreator,
    updatedAt: row.updated_at as number,
    completedAt: (row.completed_at as number) ?? null,
    dueAt: (row.due_at as number) ?? null,
  };
}
