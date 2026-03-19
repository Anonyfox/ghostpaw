import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createStoryline } from "./create_storyline.ts";
import { getStoryline } from "./get_storyline.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getStoryline", () => {
  it("returns a storyline by id", () => {
    const created = createStoryline(db, { title: "Test" });
    const fetched = getStoryline(db, created.id);
    ok(fetched);
    strictEqual(fetched.id, created.id);
  });

  it("returns null for nonexistent id", () => {
    strictEqual(getStoryline(db, 999), null);
  });
});
