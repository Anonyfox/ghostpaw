import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import { turnInQuest } from "./turn_in_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("turnInQuest", () => {
  it("transitions done quest to turned_in", () => {
    const q = createQuest(db, { title: "Ship it" });
    completeQuest(db, q.id);

    const result = turnInQuest(db, q.id);
    strictEqual(result.status, "turned_in");
    ok(result.updatedAt >= q.updatedAt);
  });

  it("preserves original completed_at", () => {
    const q = createQuest(db, { title: "Ship it" });
    const done = completeQuest(db, q.id) as typeof q;
    const result = turnInQuest(db, q.id);
    strictEqual(result.completedAt, done.completedAt);
  });

  it("throws for active quest", () => {
    const q = createQuest(db, { title: "Active one" });
    db.prepare("UPDATE quests SET status = 'active' WHERE id = ?").run(q.id);
    throws(() => turnInQuest(db, q.id), /only "done" quests can be turned in/);
  });

  it("throws for already turned_in quest", () => {
    const q = createQuest(db, { title: "Old news" });
    completeQuest(db, q.id);
    turnInQuest(db, q.id);
    throws(() => turnInQuest(db, q.id), /only "done" quests can be turned in/);
  });

  it("throws for failed quest", () => {
    const q = createQuest(db, { title: "Failed" });
    db.prepare("UPDATE quests SET status = 'failed' WHERE id = ?").run(q.id);
    throws(() => turnInQuest(db, q.id), /only "done" quests can be turned in/);
  });

  it("throws for nonexistent quest", () => {
    throws(() => turnInQuest(db, 999), /not found/);
  });
});
