import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { getQuest } from "./get_quest.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getQuest", () => {
  it("returns a quest by id", () => {
    const created = createQuest(db, { title: "Test" });
    const fetched = getQuest(db, created.id);
    ok(fetched);
    strictEqual(fetched.id, created.id);
    strictEqual(fetched.title, "Test");
  });

  it("returns null for nonexistent id", () => {
    strictEqual(getQuest(db, 999), null);
  });
});
