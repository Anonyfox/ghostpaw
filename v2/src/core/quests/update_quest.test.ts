import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("updateQuest", () => {
  it("updates title and description", () => {
    const q = createQuest(db, { title: "Old", description: "Old desc" });
    const updated = updateQuest(db, q.id, {
      title: "New",
      description: "New desc",
    });
    strictEqual(updated.title, "New");
    strictEqual(updated.description, "New desc");
    ok(updated.updatedAt >= q.updatedAt);
  });

  it("updates status to active", () => {
    const q = createQuest(db, { title: "Test" });
    const updated = updateQuest(db, q.id, { status: "active" });
    strictEqual(updated.status, "active");
    strictEqual(updated.completedAt, null);
  });

  it("sets completed_at on terminal transition", () => {
    const q = createQuest(db, { title: "Test" });
    const done = updateQuest(db, q.id, { status: "done" });
    strictEqual(done.status, "done");
    ok(done.completedAt! > 0);
  });

  it("sets completed_at on failed transition", () => {
    const q = createQuest(db, { title: "Test" });
    const failed = updateQuest(db, q.id, { status: "failed" });
    ok(failed.completedAt! > 0);
  });

  it("does not overwrite completed_at if already terminal", () => {
    const q = createQuest(db, { title: "Test" });
    const done = updateQuest(db, q.id, { status: "done" });
    const updated = updateQuest(db, done.id, { title: "Still done" });
    strictEqual(updated.completedAt, done.completedAt);
  });

  it("clears nullable fields with null", () => {
    const q = createQuest(db, {
      title: "Test",
      description: "desc",
      tags: "a,b",
      dueAt: Date.now() + 100000,
    });
    const updated = updateQuest(db, q.id, {
      description: null,
      tags: null,
      dueAt: null,
    });
    strictEqual(updated.description, null);
    strictEqual(updated.tags, null);
    strictEqual(updated.dueAt, null);
  });

  it("updates temporal fields", () => {
    const q = createQuest(db, { title: "Event" });
    const start = Date.now() + 100000;
    const end = start + 3600000;
    const updated = updateQuest(db, q.id, { startsAt: start, endsAt: end });
    strictEqual(updated.startsAt, start);
    strictEqual(updated.endsAt, end);
  });

  it("returns unchanged quest when no fields provided", () => {
    const q = createQuest(db, { title: "Test" });
    const same = updateQuest(db, q.id, {});
    strictEqual(same.title, q.title);
    strictEqual(same.updatedAt, q.updatedAt);
  });

  it("throws for nonexistent quest", () => {
    throws(() => updateQuest(db, 999, { title: "Nope" }), /not found/);
  });

  it("rejects invalid status", () => {
    const q = createQuest(db, { title: "Test" });
    throws(() => updateQuest(db, q.id, { status: "bogus" as never }), /Invalid status/);
  });

  it("rejects empty title", () => {
    const q = createQuest(db, { title: "Test" });
    throws(() => updateQuest(db, q.id, { title: "  " }), /cannot be empty/);
  });

  it("rejects nonexistent quest_log_id", () => {
    const q = createQuest(db, { title: "Test" });
    throws(() => updateQuest(db, q.id, { questLogId: 999 }), /does not exist/);
  });

  it("updates FTS index on title change", () => {
    const q = createQuest(db, { title: "original" });
    updateQuest(db, q.id, { title: "replacement" });
    const oldHits = db
      .prepare("SELECT rowid FROM quests_fts WHERE quests_fts MATCH 'original'")
      .all();
    const newHits = db
      .prepare("SELECT rowid FROM quests_fts WHERE quests_fts MATCH 'replacement'")
      .all();
    strictEqual(oldHits.length, 0);
    strictEqual(newHits.length, 1);
  });
});
