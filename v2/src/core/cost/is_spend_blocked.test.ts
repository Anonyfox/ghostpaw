import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { isSpendBlocked } from "./is_spend_blocked.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(costUsd: number, lastActiveAt: number) {
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, cost_usd)
     VALUES (?, 'chat', ?, ?, ?)`,
  ).run(`test:${Date.now()}:${Math.random()}`, lastActiveAt, lastActiveAt, costUsd);
}

describe("isSpendBlocked", () => {
  it("returns false when limit is zero (unlimited)", () => {
    insertSession(100, Date.now());
    strictEqual(isSpendBlocked(db, 0), false);
  });

  it("returns false when limit is negative (unlimited)", () => {
    insertSession(100, Date.now());
    strictEqual(isSpendBlocked(db, -5), false);
  });

  it("returns false when spend is below limit", () => {
    insertSession(2.0, Date.now());
    strictEqual(isSpendBlocked(db, 5.0), false);
  });

  it("returns true when spend equals limit", () => {
    insertSession(5.0, Date.now());
    strictEqual(isSpendBlocked(db, 5.0), true);
  });

  it("returns true when spend exceeds limit", () => {
    insertSession(7.0, Date.now());
    strictEqual(isSpendBlocked(db, 5.0), true);
  });

  it("returns false when no sessions exist", () => {
    strictEqual(isSpendBlocked(db, 5.0), false);
  });

  it("only considers sessions within the window", () => {
    const now = Date.now();
    insertSession(10.0, now - 86_400_001);
    insertSession(1.0, now - 1000);
    strictEqual(isSpendBlocked(db, 5.0), false);
  });
});
