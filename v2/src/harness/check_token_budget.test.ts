import { doesNotThrow, ok, throws } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../core/chat/index.ts";
import { initConfigTable, setConfig } from "../core/config/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase, TokenBudgetError } from "../lib/index.ts";
import { checkTokenBudget } from "./check_token_budget.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function insertSession(tokensIn: number, tokensOut: number): number {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, tokens_in, tokens_out)
     VALUES (?, 'chat', ?, ?, ?, ?)`,
  ).run(`test:${Math.random()}`, now, now, tokensIn, tokensOut);
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

describe("checkTokenBudget", () => {
  it("does nothing when usage is below default limits", () => {
    const sid = insertSession(50_000, 30_000);
    doesNotThrow(() => checkTokenBudget(db, sid));
  });

  it("does nothing when session tokens are below a custom session limit", () => {
    setConfig(db, "max_tokens_per_session", 300_000, "test");
    const sid = insertSession(50_000, 30_000);
    doesNotThrow(() => checkTokenBudget(db, sid));
  });

  it("throws TokenBudgetError with scope session when session limit reached", () => {
    setConfig(db, "max_tokens_per_session", 100_000, "test");
    const sid = insertSession(60_000, 40_000);
    throws(
      () => checkTokenBudget(db, sid),
      (err: unknown) =>
        err instanceof TokenBudgetError && err.scope === "session" && err.used === 100_000,
    );
  });

  it("throws TokenBudgetError with scope session when session limit exceeded", () => {
    setConfig(db, "max_tokens_per_session", 100_000, "test");
    const sid = insertSession(80_000, 40_000);
    throws(
      () => checkTokenBudget(db, sid),
      (err: unknown) => err instanceof TokenBudgetError && err.scope === "session",
    );
  });

  it("does nothing when day tokens are below the day limit", () => {
    setConfig(db, "max_tokens_per_day", 1_000_000, "test");
    const sid = insertSession(50_000, 30_000);
    doesNotThrow(() => checkTokenBudget(db, sid));
  });

  it("throws TokenBudgetError with scope day when day limit reached", () => {
    setConfig(db, "max_tokens_per_day", 100_000, "test");
    const sid = insertSession(60_000, 40_000);
    throws(
      () => checkTokenBudget(db, sid),
      (err: unknown) =>
        err instanceof TokenBudgetError && err.scope === "day" && err.used >= 100_000,
    );
  });

  it("checks session limit before day limit", () => {
    setConfig(db, "max_tokens_per_session", 50_000, "test");
    setConfig(db, "max_tokens_per_day", 50_000, "test");
    const sid = insertSession(30_000, 30_000);
    throws(
      () => checkTokenBudget(db, sid),
      (err: unknown) => err instanceof TokenBudgetError && err.scope === "session",
    );
  });

  it("includes actionable hint in the error message", () => {
    setConfig(db, "max_tokens_per_session", 1000, "test");
    const sid = insertSession(800, 300);
    try {
      checkTokenBudget(db, sid);
      ok(false, "should have thrown");
    } catch (err) {
      ok(err instanceof TokenBudgetError);
      ok(err.message.includes("max_tokens_per_session"));
    }
  });
});
