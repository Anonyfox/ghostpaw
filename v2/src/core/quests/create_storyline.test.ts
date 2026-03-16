import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createStoryline } from "./create_storyline.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("createStoryline", () => {
  it("creates a storyline with title", () => {
    const log = createStoryline(db, { title: "Project X" });
    ok(log.id > 0);
    strictEqual(log.title, "Project X");
    strictEqual(log.status, "active");
    strictEqual(log.createdBy, "human");
    ok(log.createdAt > 0);
  });

  it("creates with all optional fields", () => {
    const due = Date.now() + 86400000;
    const log = createStoryline(db, {
      title: "Sprint",
      description: "Week 1",
      dueAt: due,
      createdBy: "ghostpaw",
    });
    strictEqual(log.description, "Week 1");
    strictEqual(log.dueAt, due);
    strictEqual(log.createdBy, "ghostpaw");
  });

  it("rejects empty title", () => {
    throws(() => createStoryline(db, { title: "" }), /title is required/);
  });
});
