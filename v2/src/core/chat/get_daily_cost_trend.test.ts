import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getDailyCostTrend } from "./get_daily_cost_trend.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getDailyCostTrend", () => {
  it("returns entries for requested number of days", () => {
    const result = getDailyCostTrend(db, 7);
    strictEqual(result.length, 7);
    ok(result[0]!.date.match(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("includes sessions in the correct day bucket", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd)
       VALUES (?, 'chat', ?, ?, 100, 50, 0, 0, 0.5)`,
    ).run("k:today", now, now);

    const result = getDailyCostTrend(db, 3);
    strictEqual(result[0]!.costUsd, 0.5);
    strictEqual(result[0]!.tokens, 150);
    strictEqual(result[0]!.sessionCount, 1);
    strictEqual(result[1]!.costUsd, 0);
  });
});
