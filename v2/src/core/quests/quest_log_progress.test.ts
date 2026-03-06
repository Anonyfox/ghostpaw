import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { getQuestLogProgress } from "./quest_log_progress.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getQuestLogProgress", () => {
  it("returns zeros for empty quest log", () => {
    const log = createQuestLog(db, { title: "Empty" });
    const progress = getQuestLogProgress(db, log.id);
    strictEqual(progress.total, 0);
    strictEqual(progress.done, 0);
    strictEqual(progress.active, 0);
    strictEqual(progress.pending, 0);
    strictEqual(progress.blocked, 0);
  });

  it("counts quests by status", () => {
    const log = createQuestLog(db, { title: "Sprint" });
    const a = createQuest(db, { title: "A", questLogId: log.id });
    const b = createQuest(db, { title: "B", questLogId: log.id });
    createQuest(db, { title: "C", questLogId: log.id });
    const d = createQuest(db, { title: "D", questLogId: log.id });

    updateQuest(db, a.id, { status: "active" });
    completeQuest(db, b.id);
    updateQuest(db, d.id, { status: "blocked" });

    const progress = getQuestLogProgress(db, log.id);
    strictEqual(progress.total, 4);
    strictEqual(progress.done, 1);
    strictEqual(progress.active, 1);
    strictEqual(progress.pending, 1);
    strictEqual(progress.blocked, 1);
  });

  it("counts failed and cancelled as done", () => {
    const log = createQuestLog(db, { title: "Sprint" });
    const a = createQuest(db, { title: "A", questLogId: log.id });
    const b = createQuest(db, { title: "B", questLogId: log.id });
    updateQuest(db, a.id, { status: "failed" });
    updateQuest(db, b.id, { status: "cancelled" });
    const progress = getQuestLogProgress(db, log.id);
    strictEqual(progress.done, 2);
  });

  it("ignores quests not in the quest log", () => {
    const log = createQuestLog(db, { title: "Sprint" });
    createQuest(db, { title: "In log", questLogId: log.id });
    createQuest(db, { title: "Standalone" });
    const progress = getQuestLogProgress(db, log.id);
    strictEqual(progress.total, 1);
  });
});
