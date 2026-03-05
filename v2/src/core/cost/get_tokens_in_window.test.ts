import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { getTokensInWindow } from "./get_tokens_in_window.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(tokensIn: number, tokensOut: number, lastActiveAt: number) {
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out)
     VALUES (?, 'chat', ?, ?, ?, ?)`,
  ).run(`test:${Date.now()}:${Math.random()}`, lastActiveAt, lastActiveAt, tokensIn, tokensOut);
}

describe("getTokensInWindow", () => {
  it("returns zero when no sessions exist", () => {
    strictEqual(getTokensInWindow(db), 0);
  });

  it("sums tokens from sessions within the window", () => {
    const now = Date.now();
    insertSession(5000, 3000, now - 1000);
    insertSession(2000, 1000, now - 2000);
    strictEqual(getTokensInWindow(db), 11_000);
  });

  it("excludes sessions outside the window", () => {
    const now = Date.now();
    insertSession(5000, 3000, now - 1000);
    insertSession(99_000, 99_000, now - 86_400_001);
    strictEqual(getTokensInWindow(db), 8000);
  });

  it("accepts a custom window size", () => {
    const now = Date.now();
    insertSession(2000, 1000, now - 30_000);
    insertSession(8000, 4000, now - 120_000);
    strictEqual(getTokensInWindow(db, 60_000), 3000);
  });

  it("includes sessions exactly at the boundary", () => {
    const now = Date.now();
    const cutoff = now - 86_400_000;
    insertSession(1000, 500, cutoff);
    ok(getTokensInWindow(db) >= 1500);
  });

  it("handles sessions with zero tokens", () => {
    insertSession(0, 0, Date.now());
    strictEqual(getTokensInWindow(db), 0);
  });
});
