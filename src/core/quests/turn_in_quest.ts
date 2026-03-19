import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest } from "./types.ts";

export function turnInQuest(db: DatabaseHandle, id: number): Quest {
  const existing = db.prepare("SELECT status FROM quests WHERE id = ?").get(id) as
    | { status: string }
    | undefined;
  if (!existing) throw new Error(`Quest #${id} not found.`);
  if (existing.status !== "done") {
    throw new Error(`Quest #${id} is "${existing.status}" — only "done" quests can be turned in.`);
  }

  const now = Date.now();
  db.prepare("UPDATE quests SET status = 'turned_in', updated_at = ? WHERE id = ?").run(now, id);

  const row = db.prepare("SELECT * FROM quests WHERE id = ?").get(id);
  return rowToQuest(row as Record<string, unknown>);
}
