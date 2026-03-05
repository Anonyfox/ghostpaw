import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initRunsTable } from "../../core/runs/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createReviewSoulTool } from "./review_soul.ts";

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initMemoryTable(db);
  initRunsTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

const CTX = { model: "test", provider: "test" };

describe("review_soul tool", () => {
  it("returns evidence report for known soul", async () => {
    const db = await setup();
    const tool = createReviewSoulTool(db);
    const result = (await tool.execute({ args: { soul_name: "JS Engineer" }, ctx: CTX })) as {
      report: string;
    };
    ok(result.report);
    ok(result.report.includes("Evidence Report: JS Engineer"));
  });

  it("returns error for unknown soul", async () => {
    const db = await setup();
    const tool = createReviewSoulTool(db);
    const result = (await tool.execute({ args: { soul_name: "Nobody" }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error);
    ok(result.error.includes("not found"));
  });

  it("returns error for empty name", async () => {
    const db = await setup();
    const tool = createReviewSoulTool(db);
    const result = (await tool.execute({ args: { soul_name: "" }, ctx: CTX })) as {
      error: string;
    };
    strictEqual(result.error, "soul_name must not be empty.");
  });
});
