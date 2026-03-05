import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { getSpendStatus } from "./get_spend_status.ts";

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

describe("getSpendStatus", () => {
  it("returns zero spend when no sessions exist", () => {
    const status = getSpendStatus(db, 5.0);
    strictEqual(status.spent, 0);
    strictEqual(status.limit, 5.0);
    strictEqual(status.remaining, 5.0);
    strictEqual(status.percentage, 0);
    strictEqual(status.isBlocked, false);
    strictEqual(status.windowMs, 86_400_000);
  });

  it("calculates correct percentage", () => {
    insertSession(2.5, Date.now());
    const status = getSpendStatus(db, 5.0);
    strictEqual(status.percentage, 50);
    strictEqual(status.isBlocked, false);
    ok(Math.abs(status.remaining - 2.5) < 0.001);
  });

  it("caps percentage at 100", () => {
    insertSession(10.0, Date.now());
    const status = getSpendStatus(db, 5.0);
    strictEqual(status.percentage, 100);
    strictEqual(status.isBlocked, true);
    strictEqual(status.remaining, 0);
  });

  it("returns infinite remaining when limit is zero", () => {
    insertSession(10.0, Date.now());
    const status = getSpendStatus(db, 0);
    strictEqual(status.limit, 0);
    strictEqual(status.remaining, Number.POSITIVE_INFINITY);
    strictEqual(status.percentage, 0);
    strictEqual(status.isBlocked, false);
  });

  it("treats negative limit as zero", () => {
    const status = getSpendStatus(db, -3);
    strictEqual(status.limit, 0);
    strictEqual(status.isBlocked, false);
  });

  it("rounds percentage to nearest integer", () => {
    insertSession(1.0, Date.now());
    const status = getSpendStatus(db, 3.0);
    strictEqual(status.percentage, 33);
  });
});
