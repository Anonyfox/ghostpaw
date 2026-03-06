import type { QuestOccurrence } from "./types.ts";

export function rowToOccurrence(row: Record<string, unknown>): QuestOccurrence {
  return {
    id: row.id as number,
    questId: row.quest_id as number,
    occurrenceAt: row.occurrence_at as number,
    status: row.status as "done" | "skipped",
    completedAt: row.completed_at as number,
  };
}
