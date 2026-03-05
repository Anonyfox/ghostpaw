import { doesNotThrow, ok, throws } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../core/chat/index.ts";
import { initConfigTable, setConfig } from "../core/config/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase, SpendLimitError } from "../lib/index.ts";
import { checkSpendLimit } from "./check_spend_limit.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function insertSession(costUsd: number) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, cost_usd)
     VALUES (?, 'chat', ?, ?, ?)`,
  ).run(`test:${Math.random()}`, now, now, costUsd);
}

describe("checkSpendLimit", () => {
  it("does nothing when no limit is set (default 0)", () => {
    insertSession(100);
    doesNotThrow(() => checkSpendLimit(db));
  });

  it("does nothing when spend is below the limit", () => {
    setConfig(db, "max_cost_per_day", 10, "test");
    insertSession(3.0);
    doesNotThrow(() => checkSpendLimit(db));
  });

  it("throws SpendLimitError when spend reaches the limit", () => {
    setConfig(db, "max_cost_per_day", 5, "test");
    insertSession(5.0);
    throws(
      () => checkSpendLimit(db),
      (err: unknown) => err instanceof SpendLimitError && err.spent >= 5 && err.limit === 5,
    );
  });

  it("throws SpendLimitError when spend exceeds the limit", () => {
    setConfig(db, "max_cost_per_day", 5, "test");
    insertSession(8.0);
    throws(
      () => checkSpendLimit(db),
      (err: unknown) => err instanceof SpendLimitError,
    );
  });

  it("includes actionable message in the error", () => {
    setConfig(db, "max_cost_per_day", 2, "test");
    insertSession(3.0);
    try {
      checkSpendLimit(db);
      ok(false, "should have thrown");
    } catch (err) {
      ok(err instanceof SpendLimitError);
      ok(err.message.includes("Daily spend limit reached"));
      ok(err.message.includes("Settings > Costs"));
    }
  });

  it("does not block when limit is explicitly zero", () => {
    setConfig(db, "max_cost_per_day", 0, "test");
    insertSession(1000);
    doesNotThrow(() => checkSpendLimit(db));
  });
});
