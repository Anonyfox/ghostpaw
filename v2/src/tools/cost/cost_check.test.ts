import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { setConfig } from "../../core/config/api/write/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createCostCheckTool } from "./cost_check.ts";

let db: DatabaseHandle;
const ctx = { model: "test", provider: "test" } as const;

function insertSession(costUsd: number): void {
  db.prepare(
    `INSERT INTO sessions (key, purpose, model, cost_usd, last_active_at, created_at)
     VALUES (?, 'chat', 'test-model', ?, ?, ?)`,
  ).run(`test:${Date.now()}:${Math.random()}`, costUsd, Date.now(), Date.now());
}

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initConfigTable(db);
});

afterEach(() => db.close());

describe("cost_check tool", () => {
  it("returns zero spend and unlimited when no limit is configured", async () => {
    const tool = createCostCheckTool(db);
    const result = await tool.execute({ args: {}, ctx });
    strictEqual(result.spentUsd, 0);
    strictEqual(result.limitUsd, 0);
    strictEqual(result.remainingUsd, Number.POSITIVE_INFINITY);
    strictEqual(result.percentage, 0);
    strictEqual(result.isBlocked, false);
    strictEqual(result.limitConfigured, false);
  });

  it("reflects current spend against configured limit", async () => {
    setConfig(db, "max_cost_per_day", 10, "cli");
    insertSession(3.5);
    insertSession(1.5);

    const tool = createCostCheckTool(db);
    const result = await tool.execute({ args: {}, ctx });
    strictEqual(result.spentUsd, 5);
    strictEqual(result.limitUsd, 10);
    strictEqual(result.remainingUsd, 5);
    strictEqual(result.percentage, 50);
    strictEqual(result.isBlocked, false);
    strictEqual(result.limitConfigured, true);
  });

  it("reports blocked when spend exceeds limit", async () => {
    setConfig(db, "max_cost_per_day", 2, "cli");
    insertSession(3.0);

    const tool = createCostCheckTool(db);
    const result = await tool.execute({ args: {}, ctx });
    ok(result.isBlocked);
    strictEqual(result.percentage, 100);
    strictEqual(result.remainingUsd, 0);
    strictEqual(result.limitConfigured, true);
  });

  it("ignores sessions outside the 24h window", async () => {
    setConfig(db, "max_cost_per_day", 10, "cli");
    const oldTs = Date.now() - 100_000_000;
    db.prepare(
      `INSERT INTO sessions (key, purpose, model, cost_usd, last_active_at, created_at)
       VALUES (?, 'chat', 'test-model', ?, ?, ?)`,
    ).run("old:session", 9.0, oldTs, oldTs);
    insertSession(1.0);

    const tool = createCostCheckTool(db);
    const result = await tool.execute({ args: {}, ctx });
    strictEqual(result.spentUsd, 1);
    strictEqual(result.isBlocked, false);
  });
});
