import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { completeSubgoal } from "./complete_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;
let questId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  questId = createQuest(db, { title: "Test quest" }).id;
});

describe("completeSubgoal", () => {
  it("marks a subgoal as done", () => {
    const s = addSubgoal(db, questId, "Do something");
    const completed = completeSubgoal(db, s.id);
    strictEqual(completed.done, true);
    ok(completed.doneAt! > 0);
  });

  it("throws for nonexistent subgoal", () => {
    throws(() => completeSubgoal(db, 999), /not found/);
  });

  it("throws for already-done subgoal", () => {
    const s = addSubgoal(db, questId, "Already");
    completeSubgoal(db, s.id);
    throws(() => completeSubgoal(db, s.id), /already done/);
  });
});
