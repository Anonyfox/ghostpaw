import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;
let questId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  questId = createQuest(db, { title: "Test quest" }).id;
});

describe("addSubgoal", () => {
  it("adds a subgoal with auto-position", () => {
    const s = addSubgoal(db, questId, "First step");
    ok(s.id > 0);
    strictEqual(s.questId, questId);
    strictEqual(s.text, "First step");
    strictEqual(s.done, false);
    strictEqual(s.position, 0);
    strictEqual(s.doneAt, null);
    ok(s.createdAt > 0);
  });

  it("auto-increments position", () => {
    const a = addSubgoal(db, questId, "Step A");
    const b = addSubgoal(db, questId, "Step B");
    strictEqual(a.position, 0);
    strictEqual(b.position, 1);
  });

  it("accepts explicit position", () => {
    const s = addSubgoal(db, questId, "Middle", 5);
    strictEqual(s.position, 5);
  });

  it("trims text", () => {
    const s = addSubgoal(db, questId, "  padded  ");
    strictEqual(s.text, "padded");
  });

  it("rejects empty text", () => {
    throws(() => addSubgoal(db, questId, "   "), /text is required/);
  });
});
