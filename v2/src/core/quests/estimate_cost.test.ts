import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { closeSession, createSession } from "../chat/api/write/index.ts";
import { initChatTables } from "../chat/runtime/index.ts";
import { addSubgoal } from "./add_subgoal.ts";
import { createQuest } from "./create_quest.ts";
import { estimateQuestCost } from "./estimate_cost.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initQuestTables(db);
});

afterEach(() => {
  db.close();
});

describe("estimateQuestCost", () => {
  it("returns confidence 'none' with no historical data", () => {
    const q = createQuest(db, { title: "new", createdBy: "ghostpaw" });
    const est = estimateQuestCost(db, q.id);
    strictEqual(est.confidence, "none");
    strictEqual(est.sampleSize, 0);
  });

  it("returns an estimate based on historical ghostpaw quests", () => {
    const q1 = createQuest(db, { title: "past1", createdBy: "ghostpaw" });
    addSubgoal(db, q1.id, "step a");
    addSubgoal(db, q1.id, "step b");
    const s1 = createSession(db, "s1", { purpose: "quest", questId: q1.id });
    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, cost_usd = 0.05, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);
    closeSession(db, s1.id as number);
    updateQuest(db, q1.id, { status: "done" });

    const q2 = createQuest(db, { title: "past2", createdBy: "ghostpaw" });
    addSubgoal(db, q2.id, "step x");
    addSubgoal(db, q2.id, "step y");
    const s2 = createSession(db, "s2", { purpose: "quest", questId: q2.id });
    db.prepare(
      "UPDATE sessions SET tokens_in = 8000, tokens_out = 4000, cost_usd = 0.10, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s2.id);
    closeSession(db, s2.id as number);
    updateQuest(db, q2.id, { status: "done" });

    const target = createQuest(db, { title: "new", createdBy: "ghostpaw" });
    addSubgoal(db, target.id, "a");
    addSubgoal(db, target.id, "b");

    const est = estimateQuestCost(db, target.id);
    strictEqual(est.confidence, "low");
    strictEqual(est.sampleSize, 2);
    ok(est.low > 0, `low estimate should be > 0, got ${est.low}`);
    ok(est.high >= est.low, `high >= low`);
    ok(est.avgXP > 0, `avgXP > 0`);
  });

  it("scales estimate by subgoal ratio", () => {
    const q1 = createQuest(db, { title: "past", createdBy: "ghostpaw" });
    addSubgoal(db, q1.id, "a");
    addSubgoal(db, q1.id, "b");
    const s1 = createSession(db, "s1", { purpose: "quest", questId: q1.id });
    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, cost_usd = 0.10, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);
    closeSession(db, s1.id as number);
    updateQuest(db, q1.id, { status: "done" });

    const small = createQuest(db, { title: "small", createdBy: "ghostpaw" });
    addSubgoal(db, small.id, "a");
    const big = createQuest(db, { title: "big", createdBy: "ghostpaw" });
    addSubgoal(db, big.id, "a");
    addSubgoal(db, big.id, "b");
    addSubgoal(db, big.id, "c");
    addSubgoal(db, big.id, "d");

    const smallEst = estimateQuestCost(db, small.id);
    const bigEst = estimateQuestCost(db, big.id);
    ok(bigEst.high > smallEst.high, "more subgoals → higher estimate");
  });
});
