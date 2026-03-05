import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../core/chat/index.ts";
import { addMessage, createSession, initChatTables, renameSession } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { handlePostTurn } from "./post_turn.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function mockChatFactory(response: string) {
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
          inputTokens: 10,
          outputTokens: 5,
          reasoningTokens: 0,
          totalTokens: 15,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.001 },
        model: "gpt-4o",
        iterations: 1,
        content: response,
        timing: { latencyMs: 100 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

describe("handlePostTurn", () => {
  it("fires title generation for first turn of a session", async () => {
    const session = createSession(db, "test:post-turn:1", { purpose: "chat" });
    const userMsg = addMessage(db, { sessionId: session.id, role: "user", content: "hello world" });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi",
      parentId: userMsg.id,
    });

    let generatedTitle: string | undefined;
    handlePostTurn(db, session.id, "hello world", "gpt-4o", mockChatFactory("Test Title"), (t) => {
      generatedTitle = t;
    });

    for (let i = 0; i < 20 && !generatedTitle; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    ok(generatedTitle, "onTitleGenerated should have been called");
    strictEqual(generatedTitle, "Test Title");
  });

  it("does not fire when session already has a displayName", async () => {
    const session = createSession(db, "test:post-turn:2", { purpose: "chat" });
    const userMsg = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi",
      parentId: userMsg.id,
    });
    renameSession(db, session.id, "Existing Title");

    let called = false;
    handlePostTurn(db, session.id, "hello", "gpt-4o", mockChatFactory("New Title"), () => {
      called = true;
    });

    await new Promise((r) => setTimeout(r, 200));
    strictEqual(called, false);
  });

  it("does not fire when session has multiple user messages", async () => {
    const session = createSession(db, "test:post-turn:3", { purpose: "chat" });
    const u1 = addMessage(db, { sessionId: session.id, role: "user", content: "first" });
    const a1 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi",
      parentId: u1.id,
    });
    const u2 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "second",
      parentId: a1.id,
    });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "ok",
      parentId: u2.id,
    });

    let called = false;
    handlePostTurn(db, session.id, "second", "gpt-4o", mockChatFactory("Title"), () => {
      called = true;
    });

    await new Promise((r) => setTimeout(r, 200));
    strictEqual(called, false);
  });

  it("does not throw when session does not exist", () => {
    handlePostTurn(db, 99999, "hello", "gpt-4o", mockChatFactory("Title"));
  });

  it("does not throw when title generation rejects", async () => {
    const session = createSession(db, "test:post-turn:4", { purpose: "chat" });
    addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    addMessage(db, { sessionId: session.id, role: "assistant", content: "hi" });

    const failFactory = (_model: string): ChatInstance => ({
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
      get messages() {
        return [];
      },
      async generate() {
        throw new Error("LLM down");
      },
      // biome-ignore lint/correctness/useYield: mock that throws before yielding
      async *stream() {
        throw new Error("LLM down");
      },
      get lastResult() {
        return null;
      },
    });

    handlePostTurn(db, session.id, "hello", "gpt-4o", failFactory);
    await new Promise((r) => setTimeout(r, 200));
  });
});
