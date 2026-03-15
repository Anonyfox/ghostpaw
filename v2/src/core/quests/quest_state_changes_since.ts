import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function questStateChangesSince(db: DatabaseHandle, sinceMs: number): Quest[] {
  const rows = db
    .prepare("SELECT * FROM quests WHERE updated_at >= ? ORDER BY updated_at DESC")
    .all(sinceMs) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
