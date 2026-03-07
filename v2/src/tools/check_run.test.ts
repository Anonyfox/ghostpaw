import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, closeSession, createSession, initChatTables } from "../core/chat/index.ts";
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

  it("returns error for non-delegate session", async () => {
    const session = createSession(db, "chat:1", { purpose: "chat" });
    const result = (await exec({ run_id: session.id })) as { error: string };
    ok(result.error.includes("No delegation run found"));
  });

  it("returns running status for open delegate session", async () => {
    const parent = createSession(db, "p");
    const child = createSession(db, "d:1", {
      purpose: "delegate",
      model: "gpt-4o",
      parentSessionId: parent.id as number,
      soulId: 2,
    });
    addMessage(db, {
      sessionId: child.id as number,
      role: "user",
      content: "analyze code",
    });

    const result = (await exec({ run_id: child.id })) as Record<string, unknown>;
    strictEqual(result.runId, child.id);
    strictEqual(result.status, "running");
    strictEqual(result.task, "analyze code");
    strictEqual(result.result, undefined);
    strictEqual(result.completedAt, undefined);
  });

  it("returns completed status with result and cost info", async () => {
    const parent = createSession(db, "p");
    const child = createSession(db, "d:2", {
      purpose: "delegate",
      model: "gpt-4o",
      parentSessionId: parent.id as number,
    });
    addMessage(db, {
      sessionId: child.id as number,
      role: "user",
      content: "write tests",
    });
    addMessage(db, {
      sessionId: child.id as number,
      role: "assistant",
      content: "Tests written successfully.",
    });
    db.prepare(
      "UPDATE sessions SET tokens_in = 500, tokens_out = 200, cost_usd = 0.02 WHERE id = ?",
    ).run(child.id);
    closeSession(db, child.id as number);

    const result = (await exec({ run_id: child.id })) as Record<string, unknown>;
    strictEqual(result.status, "completed");
    strictEqual(result.result, "Tests written successfully.");
    strictEqual(result.tokensIn, 500);
    strictEqual(result.tokensOut, 200);
    strictEqual(result.costUsd, 0.02);
    ok(result.completedAt);
  });

  it("returns failed status with error", async () => {
    const parent = createSession(db, "p");
    const child = createSession(db, "d:3", {
      purpose: "delegate",
      model: "gpt-4o",
      parentSessionId: parent.id as number,
    });
    addMessage(db, {
      sessionId: child.id as number,
      role: "user",
      content: "break things",
    });
    closeSession(db, child.id as number, "LLM crashed");

    const result = (await exec({ run_id: child.id })) as Record<string, unknown>;
    strictEqual(result.status, "failed");
    strictEqual(result.error, "LLM crashed");
    ok(result.completedAt);
  });
});
