import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../core/chat/index.ts";
import { createSession, getSession, initChatTables } from "../core/chat/index.ts";
import { initConfigTable } from "../core/config/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { getRun, initRunsTable, listRuns } from "../core/runs/index.ts";
import { initSecretsTable } from "../core/secrets/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createDelegateHandler } from "./delegate.ts";

let db: DatabaseHandle;
let parentSessionId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  initSecretsTable(db);
  initRunsTable(db);
  ensureMandatorySouls(db);
  const session = createSession(db, "test:parent", { purpose: "chat" });
  parentSessionId = session.id as number;
});

afterEach(() => {
  db.close();
});

let capturedSystemPrompt = "";

function mockChatFactory(response: string) {
  return (model: string): ChatInstance => ({
    system(content: string) {
      capturedSystemPrompt = content;
      return this;
    },
    user() {
      return this;
    },
    assistant() {
      return this;
    },
    addTool() {
      return this;
    },
    get messages() {
      return [];
    },
    async generate() {
      return response;
    },
    async *stream() {
      yield response;
    },
    get lastResult() {
      return {
        usage: {
          inputTokens: 200,
          outputTokens: 80,
          reasoningTokens: 0,
          totalTokens: 280,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.01 },
        model,
        iterations: 1,
        content: response,
        timing: { latencyMs: 100 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

function failingChatFactory(error: string) {
  return (_model: string): ChatInstance => {
    throw new Error(error);
  };
}

function makeHandler(factory: ReturnType<typeof mockChatFactory>) {
  return createDelegateHandler({
    db,
    workspace: "/tmp/test",
    tools: [],
    chatFactory: factory,
    getParentSessionId: () => parentSessionId,
  });
}

describe("createDelegateHandler", () => {
  it("creates a delegation_runs record with correct parent session", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "do something" });
    const runs = listRuns(db, parentSessionId);
    strictEqual(runs.length, 1);
    strictEqual(runs[0]!.parentSessionId, parentSessionId);
    strictEqual(runs[0]!.task, "do something");
  });

  it("creates child session with purpose delegate and parent_session_id", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "do it" });
    const runs = listRuns(db, parentSessionId);
    const run = runs[0]!;
    ok(run.childSessionId);
    const child = getSession(db, run.childSessionId!);
    ok(child);
    strictEqual(child.purpose, "delegate");
    strictEqual(child.parentSessionId, parentSessionId);
  });

  it("child session is closed after successful foreground execution", async () => {
    const handler = makeHandler(mockChatFactory("result"));
    await handler({ task: "work" });
    const runs = listRuns(db, parentSessionId);
    const child = getSession(db, runs[0]!.childSessionId!);
    ok(child!.closedAt);
  });

  it("child session is closed even on foreground failure", async () => {
    const handler = makeHandler(failingChatFactory("boom"));
    await handler({ task: "fail" });
    const runs = listRuns(db, parentSessionId);
    const child = getSession(db, runs[0]!.childSessionId!);
    ok(child!.closedAt);
  });

  it("returns formatted string with result content (foreground)", async () => {
    const handler = makeHandler(mockChatFactory("analysis complete"));
    const result = await handler({ task: "analyze" });
    ok(typeof result === "string");
    ok((result as string).includes("analysis complete"));
    ok((result as string).includes("[default completed]"));
  });

  it("system prompt includes soul identity (Ghostpaw default)", async () => {
    capturedSystemPrompt = "";
    const handler = makeHandler(mockChatFactory("ok"));
    await handler({ task: "go" });
    ok(capturedSystemPrompt.includes("Ghostpaw"));
  });

  it("system prompt includes delegate preamble", async () => {
    capturedSystemPrompt = "";
    const handler = makeHandler(mockChatFactory("ok"));
    await handler({ task: "go" });
    ok(capturedSystemPrompt.includes("## Delegation"));
    ok(capturedSystemPrompt.includes("cannot delegate to other agents"));
  });

  it("returns error for unknown specialist with available names", async () => {
    const handler = makeHandler(mockChatFactory("ok"));
    const result = await handler({ task: "go", specialist: "nonexistent" });
    ok(typeof result === "object");
    ok((result as Record<string, unknown>).error);
    ok(((result as Record<string, unknown>).error as string).includes("Unknown specialist"));
  });

  it("uses override model when specified", async () => {
    const handler = makeHandler(mockChatFactory("ok"));
    await handler({ task: "go", model: "gpt-4o-mini" });
    const runs = listRuns(db, parentSessionId);
    strictEqual(runs[0]!.model, "gpt-4o-mini");
  });

  it("returns error object on execution failure", async () => {
    const handler = makeHandler(failingChatFactory("LLM crashed"));
    const result = await handler({ task: "break" });
    ok(typeof result === "object");
    ok(((result as Record<string, unknown>).error as string).includes("LLM crashed"));
  });

  it("marks run as failed on execution failure", async () => {
    const handler = makeHandler(failingChatFactory("kaboom"));
    await handler({ task: "explode" });
    const runs = listRuns(db, parentSessionId);
    strictEqual(runs[0]!.status, "failed");
    ok(runs[0]!.error!.includes("kaboom"));
  });

  it("marks run as completed on success", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "finish" });
    const runs = listRuns(db, parentSessionId);
    strictEqual(runs[0]!.status, "completed");
    strictEqual(runs[0]!.result, "done");
  });

  it("records token usage on the run after completion", async () => {
    const handler = makeHandler(mockChatFactory("ok"));
    await handler({ task: "count tokens" });
    const runs = listRuns(db, parentSessionId);
    strictEqual(runs[0]!.tokensIn, 200);
    strictEqual(runs[0]!.tokensOut, 80);
    strictEqual(runs[0]!.costUsd, 0.01);
  });

  it("background returns immediately with runId and running status", async () => {
    const handler = makeHandler(mockChatFactory("bg result"));
    const result = await handler({ task: "background work", background: true });
    ok(typeof result === "object");
    const obj = result as Record<string, unknown>;
    strictEqual(obj.status, "running");
    ok(typeof obj.runId === "number");
    ok((obj.message as string).includes("check_run"));
  });

  it("background completes the run asynchronously", async () => {
    const handler = makeHandler(mockChatFactory("async result"));
    const result = await handler({ task: "bg task", background: true });
    const runId = (result as Record<string, unknown>).runId as number;

    for (let i = 0; i < 50; i++) {
      const run = getRun(db, runId);
      if (run && run.status !== "running") break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const run = getRun(db, runId)!;
    strictEqual(run.status, "completed");
    strictEqual(run.result, "async result");
  });

  it("background marks run as failed on error", async () => {
    const handler = makeHandler(failingChatFactory("async boom"));
    const result = await handler({ task: "bg fail", background: true });
    const runId = (result as Record<string, unknown>).runId as number;

    for (let i = 0; i < 50; i++) {
      const run = getRun(db, runId);
      if (run && run.status !== "running") break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const run = getRun(db, runId)!;
    strictEqual(run.status, "failed");
    ok(run.error!.includes("async boom"));
  });

  it("cleans up run and session when setup phase throws (assembleContext failure)", async () => {
    const handler = makeHandler(mockChatFactory("ok"));
    db.exec("DELETE FROM soul_traits");
    db.exec("DELETE FROM souls");

    const result = await handler({ task: "go" });
    ok(typeof result === "object");
    ok(((result as Record<string, unknown>).error as string).includes("Delegation failed"));

    const runs = db.prepare("SELECT * FROM delegation_runs").all() as Record<string, unknown>[];
    strictEqual(runs.length, 1);
    strictEqual(runs[0]!.status, "failed");

    const childId = runs[0]!.child_session_id as number | null;
    if (childId) {
      const child = getSession(db, childId);
      ok(child!.closedAt);
    }
  });

  it("returns error when called outside an active turn", async () => {
    const handler = createDelegateHandler({
      db,
      workspace: "/tmp",
      tools: [],
      chatFactory: mockChatFactory("ok"),
      getParentSessionId: () => null,
    });
    const result = await handler({ task: "go" });
    ok(typeof result === "object");
    ok(((result as Record<string, unknown>).error as string).includes("outside"));
  });
});
