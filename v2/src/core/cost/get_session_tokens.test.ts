import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { getSessionTokens } from "./get_session_tokens.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function insertSession(tokensIn: number, tokensOut: number): number {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out)
     VALUES (?, 'chat', ?, ?, ?, ?)`,
  ).run(`test:${now}:${Math.random()}`, now, now, tokensIn, tokensOut);
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

describe("getSessionTokens", () => {
  it("returns the sum of tokens_in and tokens_out for a session", () => {
    const id = insertSession(5000, 3000);
    strictEqual(getSessionTokens(db, id), 8000);
  });

  it("returns zero for a nonexistent session", () => {
    strictEqual(getSessionTokens(db, 999), 0);
  });

  it("returns zero when both counters are zero", () => {
    const id = insertSession(0, 0);
    strictEqual(getSessionTokens(db, id), 0);
  });

  it("handles large token counts", () => {
    const id = insertSession(500_000, 150_000);
    strictEqual(getSessionTokens(db, id), 650_000);
  });

  it("does not include tokens from other sessions", () => {
    const id1 = insertSession(10_000, 5_000);
    insertSession(99_000, 99_000);
    strictEqual(getSessionTokens(db, id1), 15_000);
  });
});
