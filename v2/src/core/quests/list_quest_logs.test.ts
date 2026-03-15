import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { listQuestLogs } from "./list_quest_logs.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuestLog } from "./update_quest_log.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
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
