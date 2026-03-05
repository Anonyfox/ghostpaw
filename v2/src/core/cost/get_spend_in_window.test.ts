import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { getSpendInWindow } from "./get_spend_in_window.ts";

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

describe("getSpendInWindow", () => {
  it("returns zero when no sessions exist", () => {
    strictEqual(getSpendInWindow(db), 0);
  });

  it("sums cost_usd from sessions within the window", () => {
    const now = Date.now();
    insertSession(1.5, now - 1000);
    insertSession(2.0, now - 2000);
    const spent = getSpendInWindow(db);
    ok(Math.abs(spent - 3.5) < 0.001);
  });

  it("excludes sessions outside the window", () => {
    const now = Date.now();
    insertSession(1.0, now - 1000);
    insertSession(5.0, now - 86_400_001);
    const spent = getSpendInWindow(db);
    ok(Math.abs(spent - 1.0) < 0.001);
  });

  it("accepts a custom window size", () => {
    const now = Date.now();
    insertSession(2.0, now - 30_000);
    insertSession(3.0, now - 120_000);
    const spent = getSpendInWindow(db, 60_000);
    ok(Math.abs(spent - 2.0) < 0.001);
  });

  it("includes sessions exactly at the boundary", () => {
    const now = Date.now();
    const cutoff = now - 86_400_000;
    insertSession(1.0, cutoff);
    const spent = getSpendInWindow(db);
    ok(Math.abs(spent - 1.0) < 0.001);
  });

  it("handles sessions with zero cost", () => {
    insertSession(0, Date.now());
    strictEqual(getSpendInWindow(db), 0);
  });
});
