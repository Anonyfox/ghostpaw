import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getSessionTokens } from "./get_session_tokens.ts";
import { initChatTables } from "./index.ts";

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
});
