import { ok, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getHowl } from "../../core/chat/api/read/howls/index.ts";
import { getFullHistory } from "../../core/chat/api/read/index.ts";
import { createHowl, updateHowlStatus } from "../../core/chat/api/write/howls/index.ts";
import { type ChatInstance, createSession } from "../../core/chat/api/write/index.ts";
import { initChatTables, initHowlTables } from "../../core/chat/runtime/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import { initQuestTables } from "../../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { processHowlReply } from "./reply.ts";

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
          inputTokens: 80,
          outputTokens: 40,
          reasoningTokens: 0,
          totalTokens: 120,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.0005 },
        model: "test-model",
        iterations: 1,
        content: response,
        timing: { latencyMs: 30 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initConfigTable(db);
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

describe("processHowlReply", () => {
  it("processes a reply and marks the howl as responded", async () => {
    const origin = createSession(db, "chat:origin:1");
    const howl = createHowl(db, {
      originSessionId: origin.id as number,
      message: "What's your favorite editor?",
      urgency: "low",
    });

    const factory = mockFactory("Noted: the user prefers VS Code.");
    const result = await processHowlReply(db, howl.id, "I use VS Code", {
      chatFactory: factory,
    });

    strictEqual(result.howlId, howl.id);
    ok(result.summary.length > 0);

    const updated = getHowl(db, howl.id);
    ok(updated);
    strictEqual(updated.status, "responded");
  });

  it("injects Q&A into origin session", async () => {
    const origin = createSession(db, "chat:origin:2");
    const howl = createHowl(db, {
      originSessionId: origin.id as number,
      message: "Do you like tea or coffee?",
      urgency: "low",
    });

    const factory = mockFactory("Noted: user prefers tea.");
    await processHowlReply(db, howl.id, "Tea, always", {
      chatFactory: factory,
      replyChannel: "telegram",
    });

    const howlMessages = getFullHistory(db, howl.sessionId);
    ok(
      howlMessages.some((message) => message.role === "user" && message.content === "Tea, always"),
    );

    const updatedOrigin = getFullHistory(db, origin.id as number);
    ok(updatedOrigin.some((message) => message.content.includes("Howl Resolved")));
  });

  it("creates a system session for warden consolidation", async () => {
    const origin = createSession(db, "chat:origin:3");
    const howl = createHowl(db, {
      originSessionId: origin.id as number,
      message: "Question?",
      urgency: "low",
    });

    const factory = mockFactory("Processed.");
    await processHowlReply(db, howl.id, "Answer", { chatFactory: factory });

    const sysRows = db
      .prepare("SELECT * FROM sessions WHERE key LIKE 'system:howl-reply:%'")
      .all() as { id: number }[];
    strictEqual(sysRows.length, 1);
  });

  it("throws for non-existent howl", async () => {
    await rejects(() => processHowlReply(db, 999, "reply"), /not found/i);
  });

  it("throws for already-responded howl", async () => {
    const origin = createSession(db, "chat:origin:4");
    const howl = createHowl(db, {
      originSessionId: origin.id as number,
      message: "Q?",
      urgency: "low",
    });
    updateHowlStatus(db, howl.id, "responded");

    await rejects(() => processHowlReply(db, howl.id, "late reply"), /already.*responded/i);
  });
});
