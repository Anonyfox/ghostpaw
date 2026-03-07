import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { getQuestLog } from "./get_quest_log.ts";
import { listQuestLogs } from "./list_quest_logs.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuestLog } from "./update_quest_log.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("createQuestLog", () => {
  it("creates a log with title", () => {
    const log = createQuestLog(db, { title: "Project X" });
    ok(log.id > 0);
    strictEqual(log.title, "Project X");
    strictEqual(log.status, "active");
    strictEqual(log.createdBy, "human");
    ok(log.createdAt > 0);
  });

  it("creates with all optional fields", () => {
    const due = Date.now() + 86400000;
    const log = createQuestLog(db, {
      title: "Sprint",
      description: "Week 1",
      dueAt: due,
      createdBy: "ghost",
    });
    strictEqual(log.description, "Week 1");
    strictEqual(log.dueAt, due);
    strictEqual(log.createdBy, "ghost");
  });

  it("rejects empty title", () => {
    throws(() => createQuestLog(db, { title: "" }), /title is required/);
  });
});

describe("getQuestLog", () => {
  it("returns a log by id", () => {
    const created = createQuestLog(db, { title: "Test" });
    const fetched = getQuestLog(db, created.id);
    ok(fetched);
    strictEqual(fetched.id, created.id);
  });

  it("returns null for nonexistent id", () => {
    strictEqual(getQuestLog(db, 999), null);
  });
});

describe("updateQuestLog", () => {
  it("updates title", () => {
    const log = createQuestLog(db, { title: "Old" });
    const updated = updateQuestLog(db, log.id, { title: "New" });
    strictEqual(updated.title, "New");
  });

  it("sets completed_at on completed transition", () => {
    const log = createQuestLog(db, { title: "Test" });
    const completed = updateQuestLog(db, log.id, { status: "completed" });
    strictEqual(completed.status, "completed");
    ok(completed.completedAt! > 0);
  });

  it("throws for nonexistent log", () => {
    throws(() => updateQuestLog(db, 999, { title: "Nope" }), /not found/);
  });

  it("rejects invalid status", () => {
    const log = createQuestLog(db, { title: "Test" });
    throws(() => updateQuestLog(db, log.id, { status: "bogus" as never }), /Invalid status/);
  });

  it("rejects empty title", () => {
    const log = createQuestLog(db, { title: "Test" });
    throws(() => updateQuestLog(db, log.id, { title: "  " }), /cannot be empty/);
  });

  it("returns unchanged log when no fields provided", () => {
    const log = createQuestLog(db, { title: "Test" });
    const same = updateQuestLog(db, log.id, {});
    strictEqual(same.updatedAt, log.updatedAt);
  });
});

describe("listQuestLogs", () => {
  it("returns all logs ordered by updated_at desc", () => {
    createQuestLog(db, { title: "A" });
    createQuestLog(db, { title: "B" });
    createQuestLog(db, { title: "C" });
    const logs = listQuestLogs(db);
    strictEqual(logs.length, 3);
    strictEqual(logs[0].title, "C");
  });

  it("filters by status", () => {
    const a = createQuestLog(db, { title: "A" });
    createQuestLog(db, { title: "B" });
    updateQuestLog(db, a.id, { status: "archived" });
    const archived = listQuestLogs(db, { status: "archived" });
    strictEqual(archived.length, 1);
    strictEqual(archived[0].title, "A");
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      createQuestLog(db, { title: `Log ${i}` });
    }
    const page = listQuestLogs(db, { limit: 2, offset: 2 });
    strictEqual(page.length, 2);
  });
});
