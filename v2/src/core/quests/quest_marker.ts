import type { QuestStatus } from "./types.ts";
import { TERMINAL_STATUSES } from "./types.ts";

export type QuestMarkerSymbol = "!" | "?";
export type QuestMarkerColor = "yellow" | "blue" | "grey";

export interface QuestMarker {
  symbol: QuestMarkerSymbol;
  color: QuestMarkerColor;
}

/**
 * WoW-style quest markers: `!` for available/offered, `?` for completable/in-progress.
 * Returns null for terminal quests (turned_in, failed, abandoned).
 */
export function computeQuestMarker(quest: {
  status: string;
  rrule?: string | null;
}): QuestMarker | null {
  if (quest.status === "done") return { symbol: "?", color: "yellow" };
  if (quest.status === "offered") return { symbol: "!", color: "yellow" };
  if (quest.rrule && !TERMINAL_STATUSES.includes(quest.status as QuestStatus)) {
    return { symbol: "!", color: "blue" };
  }
  if (["accepted", "active", "blocked"].includes(quest.status)) {
    return { symbol: "?", color: "grey" };
  }
  return null;
}
