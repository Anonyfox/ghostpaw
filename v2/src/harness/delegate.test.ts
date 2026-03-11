import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../core/chat/index.ts";
import { createSession, getSession, initChatTables, listSessions } from "../core/chat/index.ts";
import { initConfigTable } from "../core/config/index.ts";
import { initHowlTables } from "../core/howl/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { initQuestTables } from "../core/quests/index.ts";
import { initSecretsTable } from "../core/secrets/index.ts";
import { ensureMandatorySouls, initSoulsTables, MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createDelegateHandler } from "./delegate.ts";
import { createChamberlainTools, createWardenTools } from "./tools.ts";

let db: DatabaseHandle;
let parentSessionId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  initSecretsTable(db);
  initPackTables(db);
  initQuestTables(db);
  initHowlTables(db);
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

function getDelegateChildren(parentId: number) {
  return listSessions(db, { purpose: "delegate", parentSessionId: parentId });
}

describe("createDelegateHandler", () => {
  it("creates a child session with correct parent and purpose", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "do something" });
    const children = getDelegateChildren(parentSessionId);
    strictEqual(children.length, 1);
    strictEqual(children[0]!.parentSessionId, parentSessionId);
    strictEqual(children[0]!.purpose, "delegate");
  });

  it("child session records soul_id", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "do it" });
    const children = getDelegateChildren(parentSessionId);
    ok(children[0]!.soulId != null);
  });

  it("child session is closed after successful foreground execution", async () => {
    const handler = makeHandler(mockChatFactory("result"));
    await handler({ task: "work" });
    const children = getDelegateChildren(parentSessionId);
    ok(children[0]!.closedAt);
    strictEqual(children[0]!.error, null);
  });

  it("child session is closed with error on foreground failure", async () => {
    const handler = makeHandler(failingChatFactory("boom"));
    await handler({ task: "fail" });
    const children = getDelegateChildren(parentSessionId);
    ok(children[0]!.closedAt);
    ok(children[0]!.error!.includes("boom"));
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
    const children = getDelegateChildren(parentSessionId);
    strictEqual(children[0]!.model, "gpt-4o-mini");
  });

  it("returns error object on execution failure", async () => {
    const handler = makeHandler(failingChatFactory("LLM crashed"));
    const result = await handler({ task: "break" });
    ok(typeof result === "object");
    ok(((result as Record<string, unknown>).error as string).includes("LLM crashed"));
  });

  it("child session has error set on execution failure", async () => {
    const handler = makeHandler(failingChatFactory("kaboom"));
    await handler({ task: "explode" });
    const children = getDelegateChildren(parentSessionId);
    ok(children[0]!.error!.includes("kaboom"));
  });

  it("child session has no error on success", async () => {
    const handler = makeHandler(mockChatFactory("done"));
    await handler({ task: "finish" });
    const children = getDelegateChildren(parentSessionId);
    strictEqual(children[0]!.error, null);
    ok(children[0]!.closedAt);
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

  it("background completes the child session asynchronously", async () => {
    const handler = makeHandler(mockChatFactory("async result"));
    const result = await handler({ task: "bg task", background: true });
    const childId = (result as Record<string, unknown>).runId as number;

    for (let i = 0; i < 50; i++) {
      const session = getSession(db, childId);
      if (session?.closedAt) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const session = getSession(db, childId)!;
    ok(session.closedAt);
    strictEqual(session.error, null);
  });

  it("background marks child session as failed on error", async () => {
    const handler = makeHandler(failingChatFactory("async boom"));
    const result = await handler({ task: "bg fail", background: true });
    const childId = (result as Record<string, unknown>).runId as number;

    for (let i = 0; i < 50; i++) {
      const session = getSession(db, childId);
      if (session?.closedAt) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const session = getSession(db, childId)!;
    ok(session.closedAt);
    ok(session.error!.includes("async boom"));
  });

  it("cleans up child session when setup phase throws", async () => {
    const handler = makeHandler(mockChatFactory("ok"));
    db.exec("DELETE FROM soul_traits");
    db.exec("DELETE FROM souls");

    const result = await handler({ task: "go" });
    ok(typeof result === "object");
    ok(((result as Record<string, unknown>).error as string).includes("Delegation failed"));

    const children = getDelegateChildren(parentSessionId);
    strictEqual(children.length, 1);
    ok(children[0]!.closedAt);
    ok(children[0]!.error);
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

  it("warden delegation uses warden tools only (no shared tools)", async () => {
    capturedSystemPrompt = "";
    let capturedToolCount = 0;
    const wardenTools = createWardenTools(db);
    const factory = (model: string): import("../core/chat/index.ts").ChatInstance => ({
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
        capturedToolCount++;
        return this;
      },
      get messages() {
        return [];
      },
      async generate() {
        return "warden done";
      },
      async *stream() {
        yield "warden done";
      },
      get lastResult() {
        return {
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            totalTokens: 150,
            cachedTokens: 0,
          },
          cost: { estimatedUsd: 0.005 },
          model,
          iterations: 1,
          content: "warden done",
          timing: { latencyMs: 50 },
          provider: "openai" as const,
          cached: false,
        };
      },
    });

    const handler = createDelegateHandler({
      db,
      workspace: "/tmp/test",
      tools: [],
      wardenTools,
      chatFactory: factory,
      getParentSessionId: () => parentSessionId,
    });

    const result = await handler({ task: "remember something", specialist: "Warden" });
    ok(typeof result === "string");
    ok((result as string).includes("Warden completed"));
    strictEqual(capturedToolCount, wardenTools.length);
    ok(capturedSystemPrompt.includes("Warden"));
  });

  it("warden delegation records soul_id = 5", async () => {
    const handler = createDelegateHandler({
      db,
      workspace: "/tmp/test",
      tools: [],
      wardenTools: createWardenTools(db),
      chatFactory: mockChatFactory("ok"),
      getParentSessionId: () => parentSessionId,
    });
    await handler({ task: "recall something", specialist: "Warden" });
    const children = getDelegateChildren(parentSessionId);
    strictEqual(children[0]!.soulId, MANDATORY_SOUL_IDS.warden);
  });

  it("chamberlain delegation uses chamberlain tools only (no shared tools)", async () => {
    capturedSystemPrompt = "";
    let capturedToolCount = 0;
    const chamberlainTools = createChamberlainTools(db);
    const factory = (model: string): import("../core/chat/index.ts").ChatInstance => ({
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
        capturedToolCount++;
        return this;
      },
      get messages() {
        return [];
      },
      async generate() {
        return "chamberlain done";
      },
      async *stream() {
        yield "chamberlain done";
      },
      get lastResult() {
        return {
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            reasoningTokens: 0,
            totalTokens: 150,
            cachedTokens: 0,
          },
          cost: { estimatedUsd: 0.005 },
          model,
          iterations: 1,
          content: "chamberlain done",
          timing: { latencyMs: 50 },
          provider: "openai" as const,
          cached: false,
        };
      },
    });

    const handler = createDelegateHandler({
      db,
      workspace: "/tmp/test",
      tools: [],
      chamberlainTools,
      chatFactory: factory,
      getParentSessionId: () => parentSessionId,
    });

    const result = await handler({ task: "check config", specialist: "Chamberlain" });
    ok(typeof result === "string");
    ok((result as string).includes("Chamberlain completed"));
    strictEqual(capturedToolCount, chamberlainTools.length);
    ok(capturedSystemPrompt.includes("Chamberlain"));
  });

  it("chamberlain delegation records soul_id = 6", async () => {
    const handler = createDelegateHandler({
      db,
      workspace: "/tmp/test",
      tools: [],
      chamberlainTools: createChamberlainTools(db),
      chatFactory: mockChatFactory("ok"),
      getParentSessionId: () => parentSessionId,
    });
    await handler({ task: "list secrets", specialist: "Chamberlain" });
    const children = getDelegateChildren(parentSessionId);
    strictEqual(children[0]!.soulId, MANDATORY_SOUL_IDS.chamberlain);
  });
});
