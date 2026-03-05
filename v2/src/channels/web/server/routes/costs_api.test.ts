import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../../../core/chat/index.ts";
import { initConfigTable, setConfig } from "../../../../core/config/index.ts";
import { initRunsTable } from "../../../../core/runs/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import { createCostsApiHandlers } from "./costs_api.ts";

function mockCtx() {
  let statusCode = 0;
  let body = "";
  const ctx = {
    req: {} as never,
    res: {
      writeHead(code: number) {
        statusCode = code;
      },
      end(data: string) {
        body = data;
      },
    } as never,
    params: {},
  };
  return {
    ctx,
    status: () => statusCode,
    json: () => JSON.parse(body),
  };
}

describe("costs_api", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    initChatTables(db);
    initRunsTable(db);
  });

  it("GET /api/costs returns CostsResponse shape", () => {
    const handlers = createCostsApiHandlers(db);
    const { ctx, status, json } = mockCtx();
    handlers.get(ctx);
    strictEqual(status(), 200);
    const data = json();
    ok("today" in data);
    ok("limit" in data);
    ok("byModel" in data);
    ok("bySoul" in data);
    ok("byPurpose" in data);
    ok("daily" in data);
    ok(Array.isArray(data.daily));
    strictEqual(data.daily.length, 14);
  });

  it("today summary returns zeros when no sessions exist", () => {
    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    strictEqual(data.today.costUsd, 0);
    strictEqual(data.today.tokensIn, 0);
    strictEqual(data.today.sessionCount, 0);
  });

  it("aggregates session costs for today", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (key, purpose, model, created_at, last_active_at, cost_usd, tokens_in, tokens_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("web:test", "chat", "claude-sonnet-4-6", now - 1000, now, 0.42, 30000, 15000);

    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    ok(data.today.costUsd >= 0.42);
    ok(data.today.tokensIn >= 30000);
    strictEqual(data.byModel.length, 1);
    strictEqual(data.byModel[0].model, "claude-sonnet-4-6");
  });

  it("returns default limit when not configured", () => {
    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    strictEqual(data.limit.maxCostPerDay, 0);
    strictEqual(data.limit.warnAtPercentage, 80);
  });

  it("returns configured limit", () => {
    setConfig(db, "max_cost_per_day", 5, "web");
    setConfig(db, "warn_at_percentage", 90, "web");
    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    strictEqual(data.limit.maxCostPerDay, 5);
    strictEqual(data.limit.warnAtPercentage, 90);
  });

  it("groups delegation runs by soul", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (key, purpose, model, created_at, last_active_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("web:test", "chat", "claude-sonnet-4-6", now - 1000, now);
    const sessionId = 1;

    db.prepare(
      `INSERT INTO delegation_runs (parent_session_id, specialist, model, task, status, cost_usd, tokens_in, tokens_out, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      "Ghostpaw",
      "claude-sonnet-4-6",
      "test task",
      "completed",
      0.22,
      10000,
      5000,
      now,
    );

    db.prepare(
      `INSERT INTO delegation_runs (parent_session_id, specialist, model, task, status, cost_usd, tokens_in, tokens_out, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      "Ghostpaw",
      "claude-sonnet-4-6",
      "test task 2",
      "completed",
      0.11,
      5000,
      2500,
      now,
    );

    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    strictEqual(data.bySoul.length, 1);
    strictEqual(data.bySoul[0].soul, "Ghostpaw");
    strictEqual(data.bySoul[0].runs, 2);
    ok(data.bySoul[0].costUsd >= 0.33);
  });

  it("groups sessions by purpose", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO sessions (key, purpose, model, created_at, last_active_at, cost_usd) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("web:a", "chat", "m", now, now, 0.1);
    db.prepare(
      `INSERT INTO sessions (key, purpose, model, created_at, last_active_at, cost_usd) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("web:b", "delegate", "m", now, now, 0.2);

    const handlers = createCostsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.get(ctx);
    const data = json();
    strictEqual(data.byPurpose.length, 2);
  });
});
