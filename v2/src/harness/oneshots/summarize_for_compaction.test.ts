import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance, ChatMessage } from "../../core/chat/index.ts";
import { addMessage, createSession, getHistory, initChatTables } from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { compactHistory } from "./summarize_for_compaction.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function createMockFactory(response: string) {
  let systemCall = "";
  let userCall = "";

  const instance: ChatInstance = {
    system(content: string) {
      systemCall = content;
      return this;
    },
    user(content: string) {
      userCall = content;
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
          inputTokens: 50,
          outputTokens: 30,
          reasoningTokens: 0,
          totalTokens: 80,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.002 },
        model: "gpt-4o",
        iterations: 1,
        content: response,
        timing: { latencyMs: 100 },
        provider: "openai" as const,
        cached: false,
      };
    },
  };

  return {
    factory: () => instance,
    getSystemCall: () => systemCall,
    getUserCall: () => userCall,
  };
}

describe("compactHistory", () => {
  it("creates a compaction message with the LLM summary", async () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi there",
      parentId: m1.id,
    });
    const history: ChatMessage[] = [
      { ...m1, parentId: null },
      { ...m2, parentId: m1.id },
    ];
    const mock = createMockFactory("Summary: user said hello, assistant said hi");
    const compaction = await compactHistory(db, session.id, history, "gpt-4o", mock.factory);

    strictEqual(compaction.isCompaction, true);
    strictEqual(compaction.content, "Summary: user said hello, assistant said hi");
    strictEqual(compaction.role, "assistant");
    strictEqual(compaction.parentId, m2.id);
  });

  it("records token usage from the LLM result", async () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "msg" });
    const mock = createMockFactory("summary");
    const compaction = await compactHistory(
      db,
      session.id,
      [{ ...m1, parentId: null }],
      "gpt-4o",
      mock.factory,
    );
    strictEqual(compaction.tokensIn, 50);
    strictEqual(compaction.tokensOut, 30);
    strictEqual(compaction.costUsd, 0.002);
  });

  it("sends conversation text to the LLM", async () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "A" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "B",
      parentId: m1.id,
    });
    const mock = createMockFactory("compact");
    await compactHistory(
      db,
      session.id,
      [
        { ...m1, parentId: null },
        { ...m2, parentId: m1.id },
      ],
      "gpt-4o",
      mock.factory,
    );
    ok(mock.getUserCall().includes("user: A"));
    ok(mock.getUserCall().includes("assistant: B"));
  });

  it("compaction message truncates history on subsequent getHistory call", async () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "old-1" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "old-2",
      parentId: m1.id,
    });
    const mock = createMockFactory("summarized");
    const compaction = await compactHistory(
      db,
      session.id,
      [
        { ...m1, parentId: null },
        { ...m2, parentId: m1.id },
      ],
      "gpt-4o",
      mock.factory,
    );
    addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "new message",
      parentId: compaction.id,
    });

    const history = getHistory(db, session.id);
    strictEqual(history.length, 2);
    strictEqual(history[0]!.content, "summarized");
    strictEqual(history[1]!.content, "new message");
  });
});
