import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import { createSession, initChatTables } from "../../core/chat/index.ts";
import { initHowlTables } from "../../core/howl/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initPackTables } from "../../core/pack/index.ts";
import { initQuestTables } from "../../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { consolidateHaunt } from "./consolidate.ts";

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

describe("consolidateHaunt", () => {
  it("extracts summary from model response", async () => {
    const session = createSession(db, "haunt:test:1", { purpose: "haunt" });
    const factory = mockFactory("Explored workspace structure and found interesting patterns.");

    const result = await consolidateHaunt(
      db,
      session.id as number,
      "I looked at the workspace and noticed...",
      [],
      "test-model",
      factory,
    );

    ok(result.summary.length > 0);
    ok(result.summary.includes("Explored workspace"));
    strictEqual(result.highlight, null);
  });

  it("extracts highlight when present", async () => {
    const session = createSession(db, "haunt:test:2", { purpose: "haunt" });
    const factory = mockFactory(
      "Explored the config system.\n\nHIGHLIGHT: Your MCP config references a missing provider.",
    );

    const result = await consolidateHaunt(
      db,
      session.id as number,
      "I investigated the MCP setup...",
      [],
      "test-model",
      factory,
    );

    ok(result.highlight !== null);
    ok(result.highlight.includes("MCP config"));
  });

  it("returns zero tool calls when model produces no tool calls", async () => {
    const session = createSession(db, "haunt:test:3", { purpose: "haunt" });
    const factory = mockFactory("Nothing noteworthy happened.");

    const result = await consolidateHaunt(
      db,
      session.id as number,
      "Brief session.",
      [],
      "test-model",
      factory,
    );

    strictEqual(Object.keys(result.toolCalls).length, 0);
  });

  it("creates a system session for consolidation", async () => {
    const session = createSession(db, "haunt:test:4", { purpose: "haunt" });
    const factory = mockFactory("Summary of the session.");

    await consolidateHaunt(
      db,
      session.id as number,
      "Journal content here.",
      [],
      "test-model",
      factory,
    );

    const sysRows = db
      .prepare("SELECT * FROM sessions WHERE key LIKE 'system:consolidate:%'")
      .all() as { id: number }[];
    strictEqual(sysRows.length, 1);
  });

  it("truncates long summaries", async () => {
    const session = createSession(db, "haunt:test:5", { purpose: "haunt" });
    const longResponse = "A".repeat(600);
    const factory = mockFactory(longResponse);

    const result = await consolidateHaunt(
      db,
      session.id as number,
      "Journal.",
      [],
      "test-model",
      factory,
    );

    ok(result.summary.length <= 503);
    ok(result.summary.endsWith("..."));
  });
});
