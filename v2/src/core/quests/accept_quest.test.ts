import { deepStrictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { acceptQuest } from "./accept_quest.ts";
import { createQuest } from "./create_quest.ts";
import { createQuestLog } from "./create_quest_log.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("acceptQuest", () => {
  it("transitions offered quest to pending", () => {
    const q = createQuest(db, { title: "test", status: "offered" });
    deepStrictEqual(q.status, "offered");
    const accepted = acceptQuest(db, q.id);
    deepStrictEqual(accepted.status, "pending");
  });

  it("assigns to quest log on accept", () => {
    const log = createQuestLog(db, { title: "storyline" });
    const q = createQuest(db, { title: "test", status: "offered" });
    const accepted = acceptQuest(db, q.id, { questLogId: log.id });
    deepStrictEqual(accepted.status, "pending");
    deepStrictEqual(accepted.questLogId, log.id);
  });

  it("throws for non-offered quest", () => {
    const q = createQuest(db, { title: "test" });
    throws(() => acceptQuest(db, q.id), /not "offered"/);
  });

  it("throws for non-existent quest", () => {
    throws(() => acceptQuest(db, 999), /not found/);
  });
});
