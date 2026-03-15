import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuestLog } from "./update_quest_log.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
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
