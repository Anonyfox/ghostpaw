import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getCostByPurpose } from "./get_cost_by_purpose.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(purpose: string, cost: number) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd)
     VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?)`,
  ).run(`k:${Math.random()}`, purpose, now, now, cost);
}

describe("getCostByPurpose", () => {
  it("returns empty array when no sessions exist", () => {
    strictEqual(getCostByPurpose(db, 0).length, 0);
  });

  it("groups by purpose and orders by cost descending", () => {
    insertSession("chat", 0.5);
    insertSession("chat", 0.3);
    insertSession("delegate", 1.0);

    const result = getCostByPurpose(db, 0);
    strictEqual(result.length, 2);
    strictEqual(result[0]!.purpose, "delegate");
    strictEqual(result[0]!.costUsd, 1.0);
    strictEqual(result[1]!.purpose, "chat");
    strictEqual(result[1]!.sessionCount, 2);
  });
});
