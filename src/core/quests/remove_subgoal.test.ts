import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { listSubgoals } from "./list_subgoals.ts";
import { removeSubgoal } from "./remove_subgoal.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;
let questId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  questId = createQuest(db, { title: "Test quest" }).id;
});

describe("removeSubgoal", () => {
  it("removes a subgoal", () => {
    const s = addSubgoal(db, questId, "Temporary");
    removeSubgoal(db, s.id);
    strictEqual(listSubgoals(db, questId).length, 0);
  });

  it("throws for nonexistent subgoal", () => {
    throws(() => removeSubgoal(db, 999), /not found/);
  });
});
