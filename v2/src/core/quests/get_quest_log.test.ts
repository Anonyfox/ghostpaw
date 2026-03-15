import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { getQuestLog } from "./get_quest_log.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
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
