import { deepStrictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { dismissQuest } from "./dismiss_quest.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("dismissQuest", () => {
  it("transitions offered quest to abandoned", () => {
    const q = createQuest(db, { title: "test", status: "offered" });
    deepStrictEqual(q.status, "offered");
    const dismissed = dismissQuest(db, q.id);
    deepStrictEqual(dismissed.status, "abandoned");
  });

  it("throws for non-offered quest", () => {
    const q = createQuest(db, { title: "test" });
    throws(() => dismissQuest(db, q.id), /not "offered"/);
  });

  it("throws for non-existent quest", () => {
    throws(() => dismissQuest(db, 999), /not found/);
  });
});
