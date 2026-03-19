import { deepStrictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { acceptQuest } from "./accept_quest.ts";
import { createQuest } from "./create_quest.ts";
import { createStoryline } from "./create_storyline.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("acceptQuest", () => {
  it("transitions offered quest to accepted", () => {
    const q = createQuest(db, { title: "test", status: "offered" });
    deepStrictEqual(q.status, "offered");
    const accepted = acceptQuest(db, q.id);
    deepStrictEqual(accepted.status, "accepted");
  });

  it("assigns to storyline on accept", () => {
    const log = createStoryline(db, { title: "storyline" });
    const q = createQuest(db, { title: "test", status: "offered" });
    const accepted = acceptQuest(db, q.id, { storylineId: log.id });
    deepStrictEqual(accepted.status, "accepted");
    deepStrictEqual(accepted.storylineId, log.id);
  });

  it("throws for non-offered quest", () => {
    const q = createQuest(db, { title: "test" });
    throws(() => acceptQuest(db, q.id), /not "offered"/);
  });

  it("throws for non-existent quest", () => {
    throws(() => acceptQuest(db, 999), /not found/);
  });
});
