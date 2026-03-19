import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getCostByModel } from "./get_cost_by_model.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(model: string, cost: number, tokensIn: number, tokensOut: number) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, model, created_at, last_active_at, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd)
     VALUES (?, 'chat', ?, ?, ?, ?, ?, 0, 0, ?)`,
  ).run(`k:${Math.random()}`, model, now, now, tokensIn, tokensOut, cost);
}

describe("getCostByModel", () => {
  it("returns empty array when no sessions exist", () => {
    strictEqual(getCostByModel(db, 0).length, 0);
  });

  it("groups by model and orders by cost descending", () => {
    insertSession("gpt-4", 0.5, 100, 50);
    insertSession("gpt-4", 0.3, 80, 40);
    insertSession("claude", 1.0, 200, 100);

    const result = getCostByModel(db, 0);
    strictEqual(result.length, 2);
    strictEqual(result[0]!.model, "claude");
    strictEqual(result[0]!.costUsd, 1.0);
    strictEqual(result[0]!.calls, 1);
    strictEqual(result[1]!.model, "gpt-4");
    strictEqual(result[1]!.calls, 2);
  });
});
