import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../core/chat/chat_instance.ts";
import {
  addMessage,
  closeSession,
  createSession,
  getSession,
  initChatTables,
  markDistilled,
} from "../core/chat/index.ts";
import { initHowlTables } from "../core/howl/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { initQuestTables } from "../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { handlePostSession } from "./post_session.ts";

function mockFactory(response: string) {
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
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
          totalTokens: 150,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.001 },
        model: "test-model",
        iterations: 1,
        content: response,
        timing: { latencyMs: 50 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

function failFactory() {
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
      throw new Error("API down");
    },
    // biome-ignore lint/correctness/useYield: mock that throws before yielding
    async *stream() {
      throw new Error("API down");
    },
    get lastResult() {
      return null;
    },
  });
}

function addChainedMessages(
  db: DatabaseHandle,
  sessionId: number,
  pairs: [string, string][],
): void {
  let parentId: number | undefined;
  for (const [userContent, assistantContent] of pairs) {
    const m1 = addMessage(db, { sessionId, role: "user", content: userContent, parentId });
    const m2 = addMessage(db, {
      sessionId,
      role: "assistant",
      content: assistantContent,
      parentId: m1.id as number,
    });
    parentId = m2.id as number;
  }
}

describe("handlePostSession", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
    initSoulsTables(db);
    initMemoryTable(db);
    initPackTables(db);
    initQuestTables(db);
    initHowlTables(db);
    ensureMandatorySouls(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns null for non-existent session", () => {
    const result = handlePostSession(db, 99999, "test-model", mockFactory("ok"));
    strictEqual(result, null);
  });

  it("returns null for system session", () => {
    const session = createSession(db, "system:test", { purpose: "system" });
    addChainedMessages(db, session.id as number, [["hello", "hi"]]);
    const result = handlePostSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result, null);
  });

  it("returns null for already distilled session", () => {
    const session = createSession(db, "web:chat:1", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [["hello world", "hi there"]]);
    markDistilled(db, session.id as number);
    const result = handlePostSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result, null);
  });

  it("returns null for session with too few messages", () => {
    const session = createSession(db, "web:chat:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const result = handlePostSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result, null);
  });

  it("returns a promise for eligible session", async () => {
    const session = createSession(db, "web:chat:3", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "I prefer TypeScript and ESM modules for all my projects and use 2-space indentation always.",
        "Got it! I will remember your preferences for TypeScript with ESM and 2-space indentation.",
      ],
    ]);
    closeSession(db, session.id as number);
    const result = handlePostSession(
      db,
      session.id as number,
      "test-model",
      mockFactory("Nothing notable."),
    );
    ok(result !== null);
    ok(result instanceof Promise);
    await result;
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("error does not propagate", async () => {
    const session = createSession(db, "web:chat:4", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "A message with enough content to pass the minimum conversation length requirement for tests.",
        "A response with enough content to pass the minimum conversation length requirement for tests.",
      ],
    ]);
    closeSession(db, session.id as number);
    const result = handlePostSession(db, session.id as number, "test-model", failFactory());
    ok(result !== null);
    await result;
  });
});
