import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import { skipOccurrence } from "./skip_occurrence.ts";
import { getStreakInfo } from "./streak_info.ts";

const DAY = 86_400_000;
let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getStreakInfo", () => {
  it("returns null for non-recurring quest", () => {
    const q = createQuest(db, { title: "One-off" });
    strictEqual(getStreakInfo(db, q.id), null);
  });

  it("returns zeros for recurring quest with no occurrences", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    deepStrictEqual(getStreakInfo(db, q.id), {
      currentStreak: 0,
      longestStreak: 0,
      totalDone: 0,
      totalSkipped: 0,
      lastCompletedAt: null,
      atRisk: false,
    });
  });

  it("counts consecutive done as streak", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const base = 1_000_000_000;
    completeQuest(db, q.id, base);
    completeQuest(db, q.id, base + DAY);
    completeQuest(db, q.id, base + 2 * DAY);
    const info = getStreakInfo(db, q.id)!;
    strictEqual(info.currentStreak, 3);
    strictEqual(info.longestStreak, 3);
    strictEqual(info.totalDone, 3);
    strictEqual(info.totalSkipped, 0);
  });

  it("resets streak on skipped occurrence", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const base = 1_000_000_000;
    completeQuest(db, q.id, base);
    completeQuest(db, q.id, base + DAY);
    skipOccurrence(db, q.id, base + 2 * DAY);
    completeQuest(db, q.id, base + 3 * DAY);
    const info = getStreakInfo(db, q.id)!;
    strictEqual(info.currentStreak, 1);
    strictEqual(info.longestStreak, 2);
    strictEqual(info.totalDone, 3);
    strictEqual(info.totalSkipped, 1);
  });

  it("resets streak on gap exceeding threshold", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const base = 1_000_000_000;
    completeQuest(db, q.id, base);
    completeQuest(db, q.id, base + DAY);
    // gap of 5 days — exceeds 2 × 1 day threshold
    completeQuest(db, q.id, base + 6 * DAY);
    completeQuest(db, q.id, base + 7 * DAY);
    const info = getStreakInfo(db, q.id)!;
    strictEqual(info.currentStreak, 2);
    strictEqual(info.longestStreak, 2);
    strictEqual(info.totalDone, 4);
  });

  it("preserves longest streak across multiple breaks", () => {
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const base = 1_000_000_000;
    // 4-day streak
    for (let i = 0; i < 4; i++) completeQuest(db, q.id, base + i * DAY);
    // skip
    skipOccurrence(db, q.id, base + 4 * DAY);
    // 2-day streak
    completeQuest(db, q.id, base + 5 * DAY);
    completeQuest(db, q.id, base + 6 * DAY);
    const info = getStreakInfo(db, q.id)!;
    strictEqual(info.currentStreak, 2);
    strictEqual(info.longestStreak, 4);
  });

  it("handles weekly BYDAY gap threshold correctly", () => {
    const q = createQuest(db, { title: "MWF", rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR" });
    const base = 1_000_000_000;
    // Mon→Wed gap (2 days) should NOT break streak (threshold ≈ 4.67 days)
    completeQuest(db, q.id, base);
    completeQuest(db, q.id, base + 2 * DAY);
    completeQuest(db, q.id, base + 4 * DAY);
    const info = getStreakInfo(db, q.id)!;
    strictEqual(info.currentStreak, 3);
  });

  it("returns null for nonexistent quest", () => {
    strictEqual(getStreakInfo(db, 99999), null);
  });
});
