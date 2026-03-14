import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSession } from "../core/chat/api/read/index.ts";
import type { ChatInstance } from "../core/chat/api/write/index.ts";
import {
  addMessage,
  closeSession,
  createSession,
  markDistilled,
} from "../core/chat/api/write/index.ts";
import { initChatTables, initHowlTables } from "../core/chat/runtime/index.ts";
import { initMemoryTable } from "../core/memory/runtime/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { initQuestTables } from "../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { distillPending } from "./distill_pending.ts";

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

describe("distillPending", () => {
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

  it("returns zeros when no eligible sessions exist", async () => {
    const result = await distillPending(db, mockFactory("ok"), "test-model");
    strictEqual(result.sessionsProcessed, 0);
    strictEqual(result.sessionsSkipped, 0);
    strictEqual(Object.keys(result.totalToolCalls).length, 0);
  });

  it("processes closed undistilled sessions", async () => {
    const session = createSession(db, "web:chat:1", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "I prefer TypeScript and ESM modules for all my projects and use 2-space indentation always.",
        "Got it! I will remember your preferences for TypeScript with ESM and 2-space indentation.",
      ],
    ]);
    closeSession(db, session.id as number);

    const result = await distillPending(db, mockFactory("Nothing notable."), "test-model");
    strictEqual(result.sessionsProcessed, 1);
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("processes stale open sessions", async () => {
    const session = createSession(db, "web:chat:2", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "This is a conversation that happened a long time ago with enough content to pass the minimum length.",
        "I understand, this response also has enough content to pass the minimum conversation length check.",
      ],
    ]);
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(
      Date.now() - 100_000_000,
      session.id,
    );

    const result = await distillPending(db, mockFactory("Nothing notable."), "test-model", {
      staleThresholdMs: 86_400_000,
    });
    strictEqual(result.sessionsProcessed, 1);
  });

  it("skips open non-stale sessions", async () => {
    const session = createSession(db, "web:chat:3", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "This conversation is still fresh and active and has enough content to pass the minimum check.",
        "Indeed, this is a recent and ongoing conversation that should not be distilled yet by sweep.",
      ],
    ]);

    const result = await distillPending(db, mockFactory("Nothing notable."), "test-model");
    strictEqual(result.sessionsProcessed, 0);
    strictEqual(result.sessionsSkipped, 0);
  });

  it("skips already distilled sessions", async () => {
    const session = createSession(db, "web:chat:4", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "A message with enough content to pass the conversation length requirement for testing distillation.",
        "This response also provides sufficient content for the testing of the distillation pipeline.",
      ],
    ]);
    closeSession(db, session.id as number);
    markDistilled(db, session.id as number);

    const result = await distillPending(db, mockFactory("Nothing notable."), "test-model");
    strictEqual(result.sessionsProcessed, 0);
    strictEqual(result.sessionsSkipped, 0);
  });

  it("respects maxSessions limit", async () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `web:chat:${i}`, { purpose: "chat" });
      addChainedMessages(db, s.id as number, [
        [
          `Message ${i} with enough content to pass minimum length. This is a long user message for test purposes.`,
          `Response ${i} with enough content to pass minimum length. This is a long assistant response for tests.`,
        ],
      ]);
      closeSession(db, s.id as number);
    }

    const result = await distillPending(db, mockFactory("Nothing."), "test-model", {
      maxSessions: 2,
    });
    strictEqual(result.sessionsProcessed + result.sessionsSkipped, 2);
  });

  it("picks up continued sessions where distilled_at was reset", async () => {
    const session = createSession(db, "web:chat:6", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "First conversation with enough content to pass minimum length. This is a longer message for testing.",
        "First response with enough content to pass minimum length. This is a longer response for testing.",
      ],
    ]);
    closeSession(db, session.id as number);
    markDistilled(db, session.id as number);

    ok(getSession(db, session.id as number)!.distilledAt !== null);

    // Reopen by adding a new message — this resets distilled_at
    const head = getSession(db, session.id as number)!.headMessageId;
    addMessage(db, {
      sessionId: session.id as number,
      role: "user",
      content: "Actually I changed my mind about the earlier preferences.",
      parentId: head as number,
    });
    // Re-close the session
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), session.id);

    strictEqual(getSession(db, session.id as number)!.distilledAt, null);

    const result = await distillPending(db, mockFactory("Nothing."), "test-model");
    ok(result.sessionsProcessed >= 1);
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("continues processing after individual session errors", async () => {
    let _callCount = 0;
    const alternatingFactory = (_model: string): ChatInstance => ({
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
        _callCount++;
        return "Nothing notable.";
      },
      async *stream() {
        yield "ok";
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
          cost: { estimatedUsd: 0.0001 },
          model: "test-model",
          iterations: 1,
          content: "ok",
          timing: { latencyMs: 10 },
          provider: "openai" as const,
          cached: false,
        };
      },
    });

    for (let i = 0; i < 3; i++) {
      const s = createSession(db, `web:chat:err${i}`, { purpose: "chat" });
      addChainedMessages(db, s.id as number, [
        [
          `Message ${i} with enough content to pass minimum length. This user message is deliberately long for testing.`,
          `Response ${i} with enough content to pass minimum length. This assistant response is also long for tests.`,
        ],
      ]);
      closeSession(db, s.id as number);
    }

    const result = await distillPending(db, alternatingFactory, "test-model");
    ok(result.sessionsProcessed + result.sessionsSkipped === 3);
  });
});
