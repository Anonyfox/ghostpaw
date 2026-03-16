import type { DatabaseHandle } from "../../lib/index.ts";
import { parseRRuleInterval } from "./rrule_interval.ts";
import type { StreakInfo } from "./types.ts";

/**
 * Compute streak statistics for a recurring quest from its occurrences.
 * Returns null if the quest is not recurring (no rrule).
 */
export function getStreakInfo(db: DatabaseHandle, questId: number): StreakInfo | null {
  const quest = db.prepare("SELECT rrule FROM quests WHERE id = ?").get(questId) as
    | { rrule: string | null }
    | undefined;
  if (!quest?.rrule) return null;

  const gapThreshold = 2 * parseRRuleInterval(quest.rrule);

  const rows = db
    .prepare(
      "SELECT status, occurrence_at, completed_at FROM quest_occurrences WHERE quest_id = ? ORDER BY occurrence_at ASC",
    )
    .all(questId) as { status: string; occurrence_at: number; completed_at: number }[];

  let totalDone = 0;
  let totalSkipped = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let lastCompletedAt: number | null = null;
  let prevAt: number | null = null;

  for (const row of rows) {
    if (row.status === "done") {
      totalDone++;
      lastCompletedAt = row.completed_at;

      const gapBroken = prevAt !== null && row.occurrence_at - prevAt > gapThreshold;
      if (gapBroken) {
        currentStreak = 1;
      } else {
        currentStreak++;
      }

      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      totalSkipped++;
      currentStreak = 0;
    }

    prevAt = row.occurrence_at;
  }

  let atRisk = false;
  if (currentStreak >= 2 && lastCompletedAt !== null) {
    const elapsed = Date.now() - lastCompletedAt;
    atRisk = elapsed > 0.75 * gapThreshold;
  }

  return { currentStreak, longestStreak, totalDone, totalSkipped, lastCompletedAt, atRisk };
}
