import { ok, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import { createSession, initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { getHowl, initHowlTables, storeHowl, updateHowlStatus } from "../../core/howl/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import { initQuestTables } from "../../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { processHowlDismiss } from "./dismiss.ts";

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
          inputTokens: 50,
          outputTokens: 20,
          reasoningTokens: 0,
          totalTokens: 70,
          cachedTokens: 0,
        },
        cost: { estimatedUsd: 0.0002 },
        model: "test-model",
        iterations: 1,
        content: response,
        timing: { latencyMs: 20 },
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

describe("processHowlDismiss", () => {
  it("marks the howl as dismissed and runs warden consolidation", async () => {
    const origin = createSession(db, "chat:origin:1");
    const howl = storeHowl(db, {
      originSessionId: origin.id as number,
      message: "Want to explore this topic?",
      urgency: "low",
    });

    const factory = mockFactory("Noted dismissal.");
    await processHowlDismiss(db, howl.id, { chatFactory: factory });

    const updated = getHowl(db, howl.id);
    ok(updated);
    strictEqual(updated.status, "dismissed");
  });

  it("creates a system session for warden dismissal processing", async () => {
    const origin = createSession(db, "chat:origin:2");
    const howl = storeHowl(db, {
      originSessionId: origin.id as number,
      message: "Curious about something?",
      urgency: "low",
    });

    const factory = mockFactory("Dismissal noted.");
    await processHowlDismiss(db, howl.id, { chatFactory: factory });

    const sysRows = db
      .prepare("SELECT * FROM sessions WHERE key LIKE 'system:howl-dismiss:%'")
      .all() as { id: number }[];
    strictEqual(sysRows.length, 1);
  });

  it("throws for non-existent howl", async () => {
    await rejects(() => processHowlDismiss(db, 999), /not found/i);
  });

  it("throws for already-dismissed howl", async () => {
    const origin = createSession(db, "chat:origin:3");
    const howl = storeHowl(db, {
      originSessionId: origin.id as number,
      message: "Q?",
      urgency: "low",
    });
    updateHowlStatus(db, howl.id, "dismissed");

    await rejects(() => processHowlDismiss(db, howl.id), /already.*dismissed/i);
  });
});
