import type { DatabaseHandle } from "../../lib/index.ts";
import { updateQuest } from "./update_quest.ts";
import type { Quest } from "./types.ts";

export function dismissQuest(db: DatabaseHandle, id: number): Quest {
  const existing = db.prepare("SELECT * FROM quests WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error(`Quest #${id} not found.`);
  }
  if (existing.status !== "offered") {
    throw new Error(
      `Quest #${id} is "${existing.status}", not "offered". Only offered quests can be dismissed.`,
    );
  }

  return updateQuest(db, id, { status: "cancelled" });
}
