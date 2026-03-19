import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function getQuest(db: DatabaseHandle, id: number): Quest | null {
  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(id);
  if (!row) return null;
  return rowToQuest(row as Record<string, unknown>);
}
