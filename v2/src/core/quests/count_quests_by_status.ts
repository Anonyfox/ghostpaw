import type { DatabaseHandle } from "../../lib/index.ts";
import type { QuestStatus } from "./types.ts";

export function countQuestsByStatus(db: DatabaseHandle, status: QuestStatus): number {
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM quests WHERE status = ?").get(status) as
    | { cnt: number }
    | undefined;
  return row?.cnt ?? 0;
}
