import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSession } from "../core/chat/create_session.ts";
import { initChatTables } from "../core/chat/schema.ts";
import { completeRun, createRun, initRunsTable, recordRunUsage } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createCheckRunTool } from "./check_run.ts";

let db: DatabaseHandle;
let tool: ReturnType<typeof createCheckRunTool>;

function exec(args: Record<string, unknown>) {
  return tool.execute({ args } as Parameters<typeof tool.execute>[0]);
}

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initRunsTable(db);
  tool = createCheckRunTool(db);
});

afterEach(() => {
  db.close();
});

describe("createCheckRunTool", () => {
  it("has correct name and description", () => {
    strictEqual(tool.name, "check_run");
    ok(tool.description.includes("status"));
  });

  it("returns error for unknown run ID", async () => {
    const result = (await exec({ run_id: 99999 })) as { error: string };
    ok(result.error.includes("99999"));
  });

  it("returns running run details", async () => {
    const session = createSession(db, "p");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "analyze code",
      specialist: "js-engineer",
    });
    const result = (await exec({ run_id: run.id })) as Record<string, unknown>;
    strictEqual(result.runId, run.id);
    strictEqual(result.status, "running");
    strictEqual(result.specialist, "js-engineer");
    strictEqual(result.task, "analyze code");
    strictEqual(result.result, undefined);
    strictEqual(result.completedAt, undefined);
  });

  it("returns completed run with result and cost info", async () => {
    const session = createSession(db, "p");
    const run = createRun(db, {
      parentSessionId: session.id as number,
      model: "gpt-4o",
      task: "write tests",
    });
    completeRun(db, run.id, "Tests written successfully.");
    recordRunUsage(db, run.id, {
      tokensIn: 500,
      tokensOut: 200,
      reasoningTokens: 0,
      cachedTokens: 0,
      costUsd: 0.02,
    });
    const result = (await exec({ run_id: run.id })) as Record<string, unknown>;
    strictEqual(result.status, "completed");
    strictEqual(result.result, "Tests written successfully.");
    strictEqual(result.tokensIn, 500);
    strictEqual(result.tokensOut, 200);
    strictEqual(result.costUsd, 0.02);
    ok(result.completedAt);
  });
});
