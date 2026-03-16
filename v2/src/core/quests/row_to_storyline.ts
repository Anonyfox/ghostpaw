import type { QuestCreator, Storyline, StorylineStatus } from "./types.ts";

export function rowToStoryline(row: Record<string, unknown>): Storyline {
  return {
    id: row.id as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as StorylineStatus,
    createdAt: row.created_at as number,
    createdBy: row.created_by as QuestCreator,
    updatedAt: row.updated_at as number,
    completedAt: (row.completed_at as number) ?? null,
    dueAt: (row.due_at as number) ?? null,
  };
}
