import { deepStrictEqual, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { completeSubgoal } from "./complete_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { listSubgoals } from "./list_subgoals.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;
let questId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  questId = createQuest(db, { title: "Test quest" }).id;
});

describe("listSubgoals", () => {
  it("returns empty array for quest with no subgoals", () => {
    deepStrictEqual(listSubgoals(db, questId), []);
  });

  it("returns subgoals ordered by position", () => {
    addSubgoal(db, questId, "Third", 2);
    addSubgoal(db, questId, "First", 0);
    addSubgoal(db, questId, "Second", 1);
    const items = listSubgoals(db, questId);
    strictEqual(items.length, 3);
    strictEqual(items[0].text, "First");
    strictEqual(items[1].text, "Second");
    strictEqual(items[2].text, "Third");
  });

  it("includes done status", () => {
    const s = addSubgoal(db, questId, "Finish");
    completeSubgoal(db, s.id);
    const items = listSubgoals(db, questId);
    strictEqual(items[0].done, true);
  });

  it("scopes to quest_id", () => {
    const other = createQuest(db, { title: "Other" }).id;
    addSubgoal(db, questId, "Mine");
    addSubgoal(db, other, "Theirs");
    strictEqual(listSubgoals(db, questId).length, 1);
    strictEqual(listSubgoals(db, other).length, 1);
  });
});
