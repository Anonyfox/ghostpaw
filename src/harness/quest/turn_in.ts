import { getXPByQuest } from "../../core/chat/api/read/index.ts";
import { turnInQuest } from "../../core/quests/api/write/index.ts";
import { dropSkillFragment } from "../../core/skills/api/write/index.ts";
import { revealShards } from "../../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import type { TurnInSummary } from "./types.ts";

export function executeTurnIn(db: DatabaseHandle, questId: number): TurnInSummary {
  db.exec("BEGIN");
  let quest: TurnInSummary["quest"];
  let revealedShards: number;
  try {
    quest = turnInQuest(db, questId);
    revealedShards = revealShards(db, "quest", String(questId));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const narrative = quest.turnInNarrative;
  const observation =
    narrative || `Quest completed: "${quest.title}". ${quest.description ?? ""}`.trim();

  let fragmentDropped = false;
  try {
    dropSkillFragment(db, "quest", String(questId), observation);
    fragmentDropped = true;
  } catch {
    // best-effort — fragment drop must not block turn-in
  }

  const xpEarned = getXPByQuest(db, questId);
  return { quest, revealedShards, fragmentDropped, xpEarned, narrative };
}
