import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeCosts } from "./cmd_costs.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function makeCtx(): CommandContext {
  return {
    db,
    sessionId: 0,
    sessionKey: "test",
    configuredKeys: new Set(),
    workspace: ".",
    version: "0.0.0-dev",
  };
}

describe("executeCosts", () => {
  it("formats cost lines for zero-cost case", async () => {
    const result = await executeCosts(makeCtx(), "");
    ok(result.text.includes("Today:"));
    ok(result.text.includes("This week:"));
    ok(result.text.includes("All time:"));
    ok(result.text.includes("$0.00"));
  });

  it("includes session counts", async () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at, cost_usd) VALUES (?, 'chat', ?, ?, ?)",
    ).run("s1", now, now, 1.5);
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at, cost_usd) VALUES (?, 'chat', ?, ?, ?)",
    ).run("s2", now, now, 0.5);

    const result = await executeCosts(makeCtx(), "");
    ok(result.text.includes("2 sessions"));
    ok(result.text.includes("$2.00"));
  });
});
