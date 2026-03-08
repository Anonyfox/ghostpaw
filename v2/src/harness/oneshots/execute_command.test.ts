import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import { getSession, initChatTables } from "../../core/chat/index.ts";
import { initHowlTables } from "../../core/howl/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initPackTables, meetMember } from "../../core/pack/index.ts";
import { initQuestTables } from "../../core/quests/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeCommand } from "./execute_command.ts";

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
        cost: { estimatedUsd: 0.003 },
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

describe("executeCommand", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
    initSoulsTables(db);
    initMemoryTable(db);
    initPackTables(db);
    initHowlTables(db);
    initQuestTables(db);
    ensureMandatorySouls(db);
  });

  afterEach(() => db.close());

  it("creates a command session and returns a response", async () => {
    const result = await executeCommand(db, "test-model", mockFactory("Done."), {
      text: "meet Alice, human from Berlin",
      channel: "cli",
    });
    ok(result.response.length > 0);
    ok(result.cost >= 0);
    ok(result.sessionId > 0);
    strictEqual(typeof result.acted, "boolean");
  });

  it("closes the session after execution", async () => {
    const result = await executeCommand(db, "test-model", mockFactory("Ok."), {
      text: "test command",
      channel: "web",
    });
    const session = getSession(db, result.sessionId);
    ok(session !== null);
    ok(session!.closedAt !== null);
    strictEqual(session!.purpose, "command");
  });

  it("pre-loads member context for targeted commands", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human", bond: "Test bond." });
    const result = await executeCommand(db, "test-model", mockFactory("Updated."), {
      text: "set timezone to Europe/Berlin",
      channel: "web",
      memberId: m.id,
    });
    ok(result.response.length > 0);
    ok(result.sessionId > 0);
  });

  it("acted is false when no tool calls are made", async () => {
    const result = await executeCommand(db, "test-model", mockFactory("I need more info."), {
      text: "vague instruction",
      channel: "cli",
    });
    strictEqual(result.acted, false);
  });
});
