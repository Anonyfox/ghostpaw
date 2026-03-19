import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { listSubgoals } from "./list_subgoals.ts";
import { reorderSubgoals } from "./reorder_subgoals.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;
let questId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  questId = createQuest(db, { title: "Test quest" }).id;
});

describe("reorderSubgoals", () => {
  it("reorders subgoals by id array", () => {
    const a = addSubgoal(db, questId, "A");
    const b = addSubgoal(db, questId, "B");
    const c = addSubgoal(db, questId, "C");
    reorderSubgoals(db, questId, [c.id, a.id, b.id]);
    const items = listSubgoals(db, questId);
    strictEqual(items[0].text, "C");
    strictEqual(items[1].text, "A");
    strictEqual(items[2].text, "B");
  });

  it("throws for id not belonging to quest", () => {
    const other = createQuest(db, { title: "Other" }).id;
    const s = addSubgoal(db, other, "Foreign");
    addSubgoal(db, questId, "Mine");
    throws(() => reorderSubgoals(db, questId, [s.id]), /does not belong/);
  });
});
