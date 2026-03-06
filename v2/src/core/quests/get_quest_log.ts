import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuestLog } from "./row_to_quest_log.ts";
import type { QuestLog } from "./types.ts";

export function getQuestLog(db: DatabaseHandle, id: number): QuestLog | null {
  const row = db.prepare("SELECT * FROM quest_logs WHERE id = ?").get(id);
  if (!row) return null;
  return rowToQuestLog(row as Record<string, unknown>);
}
