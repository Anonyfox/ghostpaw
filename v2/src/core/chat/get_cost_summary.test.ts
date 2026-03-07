import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getCostSummary } from "./get_cost_summary.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(cost: number, tokensIn: number, tokensOut: number, lastActiveAt: number) {
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd)
     VALUES (?, 'chat', ?, ?, ?, ?, 0, 0, ?)`,
  ).run(`k:${Date.now()}:${Math.random()}`, lastActiveAt, lastActiveAt, tokensIn, tokensOut, cost);
}

describe("getCostSummary", () => {
  it("returns zeroes when no sessions exist", () => {
    const result = getCostSummary(db, 0);
    strictEqual(result.costUsd, 0);
    strictEqual(result.sessionCount, 0);
  });

  it("sums cost and tokens for sessions since threshold", () => {
    const now = Date.now();
    insertSession(0.5, 100, 50, now);
    insertSession(0.3, 200, 100, now);
    insertSession(0.1, 50, 25, now - 200_000);

    const result = getCostSummary(db, now - 100);
    strictEqual(result.costUsd, 0.8);
    strictEqual(result.tokensIn, 300);
    strictEqual(result.tokensOut, 150);
    strictEqual(result.sessionCount, 2);
  });

  it("excludes zero-cost sessions from count", () => {
    const now = Date.now();
    insertSession(0, 0, 0, now);
    insertSession(0.1, 100, 50, now);

    const result = getCostSummary(db, 0);
    strictEqual(result.sessionCount, 1);
  });
});
