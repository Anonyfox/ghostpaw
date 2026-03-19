import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSession, listSessions } from "../../core/chat/api/read/index.ts";
import type { ChatInstance } from "../../core/chat/api/write/index.ts";
import { addMessage, createSession, markDistilled } from "../../core/chat/api/write/index.ts";
import { initChatTables, initHowlTables } from "../../core/chat/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import { initQuestTables } from "../../core/quests/runtime/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { distillSession } from "./distill_session.ts";

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

describe("distillSession", () => {
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

  it("skips non-existent session", async () => {
    const result = await distillSession(db, 99999, "test-model", mockFactory("ok"));
    strictEqual(result.skipped, true);
    ok(result.reason?.includes("not found"));
  });

  it("skips session with wrong purpose", async () => {
    const session = createSession(db, "system:test", { purpose: "system" });
    addChainedMessages(db, session.id as number, [["hello", "hi"]]);
    const result = await distillSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result.skipped, true);
    ok(result.reason?.includes("purpose"));
  });

  it("skips already distilled session", async () => {
    const session = createSession(db, "web:chat:1", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [["hello", "hi there"]]);
    markDistilled(db, session.id as number);
    const result = await distillSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result.skipped, true);
    ok(result.reason?.includes("Already distilled"));
  });

  it("skips session with too few messages and marks distilled", async () => {
    const session = createSession(db, "web:chat:2", { purpose: "chat" });
    addMessage(db, { sessionId: session.id as number, role: "user", content: "hi" });
    const result = await distillSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result.skipped, true);
    ok(result.reason?.includes("Too few"));
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("skips session with too short conversation and marks distilled", async () => {
    const session = createSession(db, "web:chat:3", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [["hi", "hey"]]);
    const result = await distillSession(db, session.id as number, "test-model", mockFactory("ok"));
    strictEqual(result.skipped, true);
    ok(result.reason?.includes("too short"));
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("runs distillation on eligible session and marks distilled", async () => {
    const session = createSession(db, "web:chat:4", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "I really love TypeScript and prefer ESM modules for all my projects. Also I use 2-space indentation.",
        "Got it! I will remember your preferences for TypeScript with ESM and 2-space indentation.",
      ],
    ]);

    const result = await distillSession(
      db,
      session.id as number,
      "test-model",
      mockFactory("No notable beliefs to extract from this conversation."),
    );
    strictEqual(result.skipped, false);
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("creates and closes a system session", async () => {
    const session = createSession(db, "web:chat:5", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "This is a sufficiently long message to pass the minimum conversation length check for distillation testing purposes.",
        "I understand. This response is also long enough to contribute to the conversation content for testing.",
      ],
    ]);

    await distillSession(
      db,
      session.id as number,
      "test-model",
      mockFactory("Nothing to extract."),
    );

    const systemSessions = listSessions(db, { purpose: "system" });
    ok(systemSessions.length >= 1);
    const distillSys = systemSessions.find((s) => s.key.includes(`system:distill:${session.id}`));
    ok(distillSys);
    ok(distillSys.closedAt !== null);
  });

  it("keeps distillation cost on the system session", async () => {
    const session = createSession(db, "web:chat:6", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "I prefer dark mode in all applications and I use vim keybindings. My projects are typically written in TypeScript.",
        "Noted! Dark mode, vim keybindings, and TypeScript are your preferences for development environment.",
      ],
    ]);

    const beforeCost = getSession(db, session.id as number)!.costUsd;
    await distillSession(db, session.id as number, "test-model", mockFactory("Nothing notable."));
    const afterCost = getSession(db, session.id as number)!.costUsd;
    strictEqual(afterCost, beforeCost);
    const systemSessions = listSessions(db, { purpose: "system" });
    ok(systemSessions.some((item) => item.costUsd > 0));
  });

  it("marks messages as distilled after processing", async () => {
    const session = createSession(db, "web:chat:7", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "A message with enough content to pass the minimum conversation length requirement for the distillation pipeline testing.",
        "This is a detailed response that contributes to a meaningful conversation exchange for testing purposes here.",
      ],
    ]);

    await distillSession(db, session.id as number, "test-model", mockFactory("Nothing notable."));

    const undistilledCount = (
      db
        .prepare("SELECT COUNT(*) AS cnt FROM messages WHERE session_id = ? AND distilled = 0")
        .get(session.id) as { cnt: number }
    ).cnt;
    strictEqual(undistilledCount, 0);
  });

  it("closes system session even on LLM failure", async () => {
    const session = createSession(db, "web:chat:8", { purpose: "chat" });
    addChainedMessages(db, session.id as number, [
      [
        "A message with enough content to pass the minimum conversation length requirement for the distillation pipeline testing.",
        "This is a detailed response that contributes to a meaningful conversation exchange for testing purposes here.",
      ],
    ]);

    await distillSession(db, session.id as number, "test-model", mockFactory("Error: API down"));

    const systemSessions = listSessions(db, { purpose: "system" });
    ok(systemSessions.some((s) => s.closedAt !== null));
  });

  it("handles delegate purpose sessions", async () => {
    const session = createSession(db, "delegate:task:1", { purpose: "delegate" });
    addChainedMessages(db, session.id as number, [
      [
        "A sufficiently long delegation task message that passes the minimum conversation length requirements for processing.",
        "I completed the delegation task. Here are the results of the delegated work with detailed information.",
      ],
    ]);

    const result = await distillSession(
      db,
      session.id as number,
      "test-model",
      mockFactory("Nothing notable."),
    );
    strictEqual(result.skipped, false);
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });

  it("handles howl purpose sessions", async () => {
    const session = createSession(db, "howl:thread:1", { purpose: "howl" });
    addChainedMessages(db, session.id as number, [
      [
        "Ghostpaw asked whether I still want the experimental feature enabled in my editor setup.",
        "Yes, keep it on for now. I rely on it during refactors.",
      ],
    ]);

    const result = await distillSession(
      db,
      session.id as number,
      "test-model",
      mockFactory("Nothing notable."),
    );
    strictEqual(result.skipped, false);
    ok(getSession(db, session.id as number)!.distilledAt !== null);
  });
});
