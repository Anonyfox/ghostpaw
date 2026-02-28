import { ok, rejects, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { ChatInstance, TurnContext } from "./chat_instance.ts";
import { createSession } from "./create_session.ts";
import { executeTurn } from "./execute_turn.ts";
import { getHistory } from "./get_history.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function createMockFactory(response: string, opts?: { shouldThrow?: boolean }) {
  return (_model: string): ChatInstance => ({
    system() {
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
    async generate() {
      if (opts?.shouldThrow) throw new Error("LLM failure");
      return response;
    },
    async *stream() {
      yield response;
    },
    get lastResult() {
      if (opts?.shouldThrow) return null;
      return {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
          totalTokens: 150,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.005 },
        model: "gpt-4o",
        iterations: 1,
        content: response,
        timing: { latencyMs: 200 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

function makeCtx(response: string, opts?: { shouldThrow?: boolean }): TurnContext {
  return {
    db,
    tools: [],
    createChat: createMockFactory(response, opts),
  };
}

describe("executeTurn", () => {
  it("executes a turn and returns TurnResult", async () => {
    const session = createSession(db, "k");
    const result = await executeTurn(
      {
        sessionId: session.id,
        content: "hello",
        systemPrompt: "You are helpful.",
        model: "gpt-4o",
      },
      makeCtx("Hi there!"),
    );
    strictEqual(result.content, "Hi there!");
    strictEqual(result.model, "gpt-4o");
    strictEqual(result.usage.inputTokens, 100);
    strictEqual(result.usage.outputTokens, 50);
    strictEqual(result.cost.estimatedUsd, 0.005);
    ok(result.messageId > 0);
  });

  it("persists both user and assistant messages", async () => {
    const session = createSession(db, "k");
    await executeTurn(
      {
        sessionId: session.id,
        content: "hello",
        systemPrompt: "sys",
        model: "gpt-4o",
      },
      makeCtx("response"),
    );
    const history = getHistory(db, session.id);
    strictEqual(history.length, 2);
    strictEqual(history[0]!.role, "user");
    strictEqual(history[0]!.content, "hello");
    strictEqual(history[1]!.role, "assistant");
    strictEqual(history[1]!.content, "response");
  });

  it("updates session totals after the turn", async () => {
    const session = createSession(db, "k");
    await executeTurn(
      {
        sessionId: session.id,
        content: "hello",
        systemPrompt: "sys",
        model: "gpt-4o",
      },
      makeCtx("response"),
    );
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.tokensIn, 100);
    strictEqual(updated.tokensOut, 50);
    strictEqual(updated.costUsd, 0.005);
  });

  it("records an error message when LLM fails", async () => {
    const session = createSession(db, "k");
    const result = await executeTurn(
      {
        sessionId: session.id,
        content: "hello",
        systemPrompt: "sys",
        model: "gpt-4o",
      },
      makeCtx("", { shouldThrow: true }),
    );
    ok(result.content.startsWith("Error:"));
    ok(result.content.includes("LLM failure"));
  });

  it("throws for a non-existent session", async () => {
    await rejects(
      () =>
        executeTurn(
          {
            sessionId: 99999,
            content: "hello",
            systemPrompt: "sys",
            model: "gpt-4o",
          },
          makeCtx("response"),
        ),
      /not found/i,
    );
  });

  it("chains messages from consecutive turns", async () => {
    const session = createSession(db, "k");
    await executeTurn(
      { sessionId: session.id, content: "turn 1", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx("response 1"),
    );
    await executeTurn(
      { sessionId: session.id, content: "turn 2", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx("response 2"),
    );
    const history = getHistory(db, session.id);
    strictEqual(history.length, 4);
    strictEqual(history[0]!.content, "turn 1");
    strictEqual(history[1]!.content, "response 1");
    strictEqual(history[2]!.content, "turn 2");
    strictEqual(history[3]!.content, "response 2");
  });

  it("triggers compaction when threshold is exceeded", async () => {
    const session = createSession(db, "k");
    await executeTurn(
      {
        sessionId: session.id,
        content: "a".repeat(4000),
        systemPrompt: "sys",
        model: "gpt-4o",
      },
      makeCtx("b".repeat(4000)),
    );
    const result = await executeTurn(
      {
        sessionId: session.id,
        content: "new message",
        systemPrompt: "sys",
        model: "gpt-4o",
        compactionThreshold: 10,
      },
      makeCtx("response after compaction"),
    );
    const history = getHistory(db, session.id);
    ok(history.some((m) => m.isCompaction));
    strictEqual(result.content, "response after compaction");
  });

  it("works on an empty session (first message)", async () => {
    const session = createSession(db, "k");
    const result = await executeTurn(
      { sessionId: session.id, content: "first", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx("welcome"),
    );
    strictEqual(result.content, "welcome");
    const history = getHistory(db, session.id);
    strictEqual(history.length, 2);
  });
});
