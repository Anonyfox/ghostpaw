import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initQuestTables } from "../quests/runtime/index.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { getQuestCostHistory } from "./get_quest_cost_history.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initQuestTables(db);
});

afterEach(() => {
  db.close();
});

describe("getQuestCostHistory", () => {
  it("returns empty when no completed ghostpaw quests exist", () => {
    const result = getQuestCostHistory(db);
    strictEqual(result.length, 0);
  });

  it("returns aggregated cost and XP for completed ghostpaw quests", () => {
    db.exec(
      "INSERT INTO quests (id, title, status, priority, created_by, created_at, updated_at) VALUES (1, 'q1', 'done', 'normal', 'ghostpaw', 1000, 1000)",
    );

    const fiveMinAgo = Date.now() - 300_000;
    const s1 = createSession(db, "s1", { purpose: "quest", questId: 1 });
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, cost_usd = 0.05, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);
    closeSession(db, s1.id as number);

    const s2 = createSession(db, "s2", { purpose: "quest", questId: 1 });
    db.prepare(
      "UPDATE sessions SET tokens_in = 8000, tokens_out = 4000, cost_usd = 0.10, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s2.id);
    closeSession(db, s2.id as number);

    const result = getQuestCostHistory(db);
    strictEqual(result.length, 1);
    strictEqual(result[0].questId, 1);
    strictEqual(result[0].sessionCount, 2);
    ok(result[0].totalCost > 0, "total cost > 0");
    ok(result[0].totalXP >= 0, "total XP >= 0");
  });

  it("excludes human-created quests", () => {
    db.exec(
      "INSERT INTO quests (id, title, status, priority, created_by, created_at, updated_at) VALUES (1, 'human', 'done', 'normal', 'human', 1000, 1000)",
    );
    const fiveMinAgo = Date.now() - 300_000;
    const s = createSession(db, "s1", { purpose: "quest", questId: 1 });
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, cost_usd = 0.05, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s.id);
    closeSession(db, s.id as number);

    strictEqual(getQuestCostHistory(db).length, 0);
  });

  it("excludes quests not in done status", () => {
    db.exec(
      "INSERT INTO quests (id, title, status, priority, created_by, created_at, updated_at) VALUES (1, 'active', 'active', 'normal', 'ghostpaw', 1000, 1000)",
    );
    const fiveMinAgo = Date.now() - 300_000;
    const s = createSession(db, "s1", { purpose: "quest", questId: 1 });
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, cost_usd = 0.05, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s.id);
    closeSession(db, s.id as number);

    strictEqual(getQuestCostHistory(db).length, 0);
  });

  it("excludes open sessions", () => {
    db.exec(
      "INSERT INTO quests (id, title, status, priority, created_by, created_at, updated_at) VALUES (1, 'q1', 'done', 'normal', 'ghostpaw', 1000, 1000)",
    );
    createSession(db, "open", { purpose: "quest", questId: 1 });

    strictEqual(getQuestCostHistory(db).length, 0);
  });
});
