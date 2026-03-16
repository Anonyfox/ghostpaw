import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createStoryline } from "./create_storyline.ts";
import { initQuestTables } from "./schema.ts";
import { updateStoryline } from "./update_storyline.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("updateStoryline", () => {
  it("updates title", () => {
    const log = createStoryline(db, { title: "Old" });
    const updated = updateStoryline(db, log.id, { title: "New" });
    strictEqual(updated.title, "New");
  });

  it("sets completed_at on completed transition", () => {
    const log = createStoryline(db, { title: "Test" });
    const completed = updateStoryline(db, log.id, { status: "completed" });
    strictEqual(completed.status, "completed");
    ok(completed.completedAt! > 0);
  });

  it("throws for nonexistent storyline", () => {
    throws(() => updateStoryline(db, 999, { title: "Nope" }), /not found/);
  });

  it("rejects invalid status", () => {
    const log = createStoryline(db, { title: "Test" });
    throws(() => updateStoryline(db, log.id, { status: "bogus" as never }), /Invalid status/);
  });

  it("rejects empty title", () => {
    const log = createStoryline(db, { title: "Test" });
    throws(() => updateStoryline(db, log.id, { title: "  " }), /cannot be empty/);
  });

  it("returns unchanged storyline when no fields provided", () => {
    const log = createStoryline(db, { title: "Test" });
    const same = updateStoryline(db, log.id, {});
    strictEqual(same.updatedAt, log.updatedAt);
  });
});
