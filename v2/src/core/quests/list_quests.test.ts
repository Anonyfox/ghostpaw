import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { listQuests } from "./list_quests.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("listQuests", () => {
  it("returns all quests ordered by newest first", () => {
    createQuest(db, { title: "A" });
    createQuest(db, { title: "B" });
    createQuest(db, { title: "C" });
    const quests = listQuests(db);
    strictEqual(quests.length, 3);
    strictEqual(quests[0].title, "C");
  });

  it("filters by status", () => {
    createQuest(db, { title: "A" });
    const b = createQuest(db, { title: "B" });
    updateQuest(db, b.id, { status: "done" });
    strictEqual(listQuests(db, { status: "done" }).length, 1);
    strictEqual(listQuests(db, { status: "pending" }).length, 1);
  });

  it("filters by quest_log_id", () => {
    const log = createQuestLog(db, { title: "Log" });
    createQuest(db, { title: "In log", questLogId: log.id });
    createQuest(db, { title: "Standalone" });
    const inLog = listQuests(db, { questLogId: log.id });
    strictEqual(inLog.length, 1);
    strictEqual(inLog[0].title, "In log");
  });

  it("filters by priority", () => {
    createQuest(db, { title: "Normal" });
    createQuest(db, { title: "Urgent", priority: "urgent" });
    strictEqual(listQuests(db, { priority: "urgent" }).length, 1);
  });

  it("filters by due_at range", () => {
    const now = Date.now();
    createQuest(db, { title: "Soon", dueAt: now + 1000 });
    createQuest(db, { title: "Later", dueAt: now + 100000 });
    createQuest(db, { title: "No due" });
    const soon = listQuests(db, { dueBefore: now + 50000 });
    strictEqual(soon.length, 1);
    strictEqual(soon[0].title, "Soon");
  });

  it("searches via FTS query", () => {
    createQuest(db, { title: "Deploy v3", description: "rollout to production" });
    createQuest(db, { title: "Write tests" });
    createQuest(db, { title: "Fix bug in deploy script" });
    const results = listQuests(db, { query: "deploy" });
    strictEqual(results.length, 2);
  });

  it("returns empty when FTS query matches nothing", () => {
    createQuest(db, { title: "Test" });
    strictEqual(listQuests(db, { query: "nonexistent" }).length, 0);
  });

  it("combines FTS query with status filter", () => {
    const a = createQuest(db, { title: "Deploy A" });
    createQuest(db, { title: "Deploy B" });
    updateQuest(db, a.id, { status: "done" });
    const active = listQuests(db, { query: "deploy", status: "pending" });
    strictEqual(active.length, 1);
    strictEqual(active[0].title, "Deploy B");
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      createQuest(db, { title: `Quest ${i}` });
    }
    const page = listQuests(db, { limit: 3, offset: 3 });
    strictEqual(page.length, 3);
  });
});
