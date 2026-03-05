import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../core/chat/index.ts";
import { initConfigTable, setConfig } from "../core/config/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { computeBudgetSummary } from "./compute_budget_summary.ts";

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

describe("computeBudgetSummary", () => {
  it("returns null when usage is well below default limits", () => {
    const sid = insertSession(10_000, 5_000);
    strictEqual(computeBudgetSummary(db, sid), null);
  });

  it("returns null when usage is below the warning threshold", () => {
    setConfig(db, "max_tokens_per_session", 200_000, "cli");
    const sid = insertSession(10_000, 5_000);
    strictEqual(computeBudgetSummary(db, sid), null);
  });

  it("returns a summary when session usage exceeds the warning threshold", () => {
    setConfig(db, "max_tokens_per_session", 200_000, "cli");
    const sid = insertSession(100_000, 65_000);
    const summary = computeBudgetSummary(db, sid);
    ok(summary !== null);
    ok(summary!.includes("Session:"));
    ok(summary!.includes("83%"));
  });

  it("returns a summary when day usage exceeds the warning threshold", () => {
    setConfig(db, "max_tokens_per_day", 100_000, "cli");
    const sid = insertSession(45_000, 40_000);
    const summary = computeBudgetSummary(db, sid);
    ok(summary !== null);
    ok(summary!.includes("Day:"));
    ok(summary!.includes("85%"));
  });

  it("respects custom warn_at_percentage", () => {
    setConfig(db, "max_tokens_per_session", 200_000, "cli");
    setConfig(db, "warn_at_percentage", 50, "cli");
    const sid = insertSession(60_000, 45_000);
    const summary = computeBudgetSummary(db, sid);
    ok(summary !== null);
    ok(summary!.includes("53%"));
  });

  it("includes both session and day lines when both are above threshold", () => {
    setConfig(db, "max_tokens_per_session", 100_000, "cli");
    setConfig(db, "max_tokens_per_day", 100_000, "cli");
    const sid = insertSession(45_000, 40_000);
    const summary = computeBudgetSummary(db, sid);
    ok(summary !== null);
    ok(summary!.includes("Session:"));
    ok(summary!.includes("Day:"));
  });

  it("shows full budget picture when session warns even if day is fine", () => {
    setConfig(db, "max_tokens_per_session", 100_000, "cli");
    setConfig(db, "max_tokens_per_day", 1_000_000, "cli");
    const sid = insertSession(45_000, 40_000);
    const summary = computeBudgetSummary(db, sid);
    ok(summary !== null);
    ok(summary!.includes("Session:"));
    ok(summary!.includes("Day:"));
  });
});
