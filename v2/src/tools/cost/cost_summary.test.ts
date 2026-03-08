import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createCostSummaryTool } from "./cost_summary.ts";

let db: DatabaseHandle;
const ctx = { model: "test", provider: "test" } as const;

function insertSession(opts: {
  costUsd: number;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  purpose?: string;
  soulId?: number;
  ageMs?: number;
}): void {
  const ts = Date.now() - (opts.ageMs ?? 0);
  db.prepare(
    `INSERT INTO sessions
       (key, purpose, model, soul_id, cost_usd, tokens_in, tokens_out, last_active_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    `test:${Date.now()}:${Math.random()}`,
    opts.purpose ?? "chat",
    opts.model ?? "test-model",
    opts.soulId ?? null,
    opts.costUsd,
    opts.tokensIn ?? 0,
    opts.tokensOut ?? 0,
    ts,
    ts,
  );
}

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
});

afterEach(() => db.close());

describe("cost_summary tool", () => {
  it("returns zeroed summary when no sessions exist", async () => {
    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: {}, ctx })) as Record<string, unknown>;
    strictEqual(result.days, 1);
    const totals = result.totals as Record<string, number>;
    strictEqual(totals.costUsd, 0);
    strictEqual(totals.sessions, 0);
    ok(!result.dailyTrend, "single-day summary should not include dailyTrend");
  });

  it("aggregates cost and tokens across sessions", async () => {
    insertSession({ costUsd: 1.5, tokensIn: 1000, tokensOut: 500 });
    insertSession({ costUsd: 2.5, tokensIn: 2000, tokensOut: 800 });

    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: { days: 1 }, ctx })) as Record<string, unknown>;
    const totals = result.totals as Record<string, number>;
    strictEqual(totals.costUsd, 4);
    strictEqual(totals.tokensIn, 3000);
    strictEqual(totals.tokensOut, 1300);
    strictEqual(totals.sessions, 2);
  });

  it("breaks down by model", async () => {
    insertSession({ costUsd: 3, model: "claude-sonnet" });
    insertSession({ costUsd: 1, model: "gpt-4o" });

    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: {}, ctx })) as Record<string, unknown>;
    const byModel = result.byModel as { model: string; costUsd: number }[];
    strictEqual(byModel.length, 2);
    strictEqual(byModel[0].model, "claude-sonnet");
    strictEqual(byModel[0].costUsd, 3);
  });

  it("breaks down by purpose", async () => {
    insertSession({ costUsd: 2, purpose: "chat" });
    insertSession({ costUsd: 1, purpose: "delegate" });
    insertSession({ costUsd: 0.5, purpose: "haunt" });

    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: {}, ctx })) as Record<string, unknown>;
    const byPurpose = result.byPurpose as { purpose: string; costUsd: number }[];
    strictEqual(byPurpose.length, 3);
    strictEqual(byPurpose[0].purpose, "chat");
  });

  it("includes daily trend when days > 1", async () => {
    insertSession({ costUsd: 1 });

    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: { days: 7 }, ctx })) as Record<string, unknown>;
    strictEqual(result.days, 7);
    const trend = result.dailyTrend as { date: string }[];
    ok(trend, "multi-day summary should include dailyTrend");
    strictEqual(trend.length, 7);
  });

  it("clamps negative days to 1", async () => {
    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: { days: -5 }, ctx })) as Record<string, unknown>;
    strictEqual(result.days, 1);
  });

  it("excludes sessions outside the requested window", async () => {
    insertSession({ costUsd: 5, ageMs: 3 * 86_400_000 });
    insertSession({ costUsd: 1 });

    const tool = createCostSummaryTool(db);
    const result = (await tool.execute({ args: { days: 1 }, ctx })) as Record<string, unknown>;
    const totals = result.totals as Record<string, number>;
    strictEqual(totals.costUsd, 1);
  });
});
