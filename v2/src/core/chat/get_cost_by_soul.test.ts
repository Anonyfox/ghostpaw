import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initSoulsTables } from "../souls/schema.ts";
import { getCostBySoul } from "./get_cost_by_soul.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
});

afterEach(() => {
  db.close();
});

function insertSoul(name: string): number {
  const now = Date.now();
  db.prepare("INSERT INTO souls (name, essence, created_at, updated_at) VALUES (?, '', ?, ?)").run(
    name,
    now,
    now,
  );
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

function insertDelegateSession(soulId: number, cost: number) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, soul_id, created_at, last_active_at, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd)
     VALUES (?, 'delegate', ?, ?, ?, 0, 0, 0, 0, ?)`,
  ).run(`delegate:${Math.random()}`, soulId, now, now, cost);
}

describe("getCostBySoul", () => {
  it("returns empty array when no delegate sessions exist", () => {
    strictEqual(getCostBySoul(db, 0).length, 0);
  });

  it("groups delegate sessions by soul with avg cost", () => {
    const s1 = insertSoul("Alpha");
    const s2 = insertSoul("Beta");
    insertDelegateSession(s1, 0.5);
    insertDelegateSession(s1, 0.3);
    insertDelegateSession(s2, 1.0);

    const result = getCostBySoul(db, 0);
    strictEqual(result.length, 2);
    strictEqual(result[0]!.soul, "Beta");
    strictEqual(result[0]!.costUsd, 1.0);
    strictEqual(result[0]!.runs, 1);
    strictEqual(result[1]!.soul, "Alpha");
    strictEqual(result[1]!.runs, 2);
    ok(Math.abs(result[1]!.avgCostUsd - 0.4) < 0.001);
  });
});
