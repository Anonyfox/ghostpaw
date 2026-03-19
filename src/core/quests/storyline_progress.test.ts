import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { createStoryline } from "./create_storyline.ts";
import { initQuestTables } from "./schema.ts";
import { getStorylineProgress } from "./storyline_progress.ts";
import { turnInQuest } from "./turn_in_quest.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getStorylineProgress", () => {
  it("returns zeros for empty storyline", () => {
    const log = createStoryline(db, { title: "Empty" });
    const progress = getStorylineProgress(db, log.id);
    strictEqual(progress.total, 0);
    strictEqual(progress.done, 0);
    strictEqual(progress.active, 0);
    strictEqual(progress.accepted, 0);
    strictEqual(progress.blocked, 0);
  });

  it("counts quests by status", () => {
    const log = createStoryline(db, { title: "Sprint" });
    const a = createQuest(db, { title: "A", storylineId: log.id });
    const b = createQuest(db, { title: "B", storylineId: log.id });
    createQuest(db, { title: "C", storylineId: log.id });
    const d = createQuest(db, { title: "D", storylineId: log.id });

    updateQuest(db, a.id, { status: "active" });
    completeQuest(db, b.id);
    updateQuest(db, d.id, { status: "blocked" });

    const progress = getStorylineProgress(db, log.id);
    strictEqual(progress.total, 4);
    strictEqual(progress.done, 1);
    strictEqual(progress.active, 1);
    strictEqual(progress.accepted, 1);
    strictEqual(progress.blocked, 1);
  });

  it("counts failed and abandoned as done", () => {
    const log = createStoryline(db, { title: "Sprint" });
    const a = createQuest(db, { title: "A", storylineId: log.id });
    const b = createQuest(db, { title: "B", storylineId: log.id });
    updateQuest(db, a.id, { status: "failed" });
    updateQuest(db, b.id, { status: "abandoned" });
    const progress = getStorylineProgress(db, log.id);
    strictEqual(progress.done, 2);
  });

  it("counts turned_in quests in done bucket", () => {
    const log = createStoryline(db, { title: "Sprint" });
    const a = createQuest(db, { title: "A", storylineId: log.id });
    completeQuest(db, a.id);
    turnInQuest(db, a.id);
    const progress = getStorylineProgress(db, log.id);
    strictEqual(progress.done, 1);
  });

  it("ignores quests not in the storyline", () => {
    const log = createStoryline(db, { title: "Sprint" });
    createQuest(db, { title: "In log", storylineId: log.id });
    createQuest(db, { title: "Standalone" });
    const progress = getStorylineProgress(db, log.id);
    strictEqual(progress.total, 1);
  });
});
