import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance, TurnResult } from "../core/chat/index.ts";
import { createSession, initChatTables } from "../core/chat/index.ts";
import { initConfigTable, setConfig } from "../core/config/index.ts";
import { initHowlTables } from "../core/howl/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { initQuestTables } from "../core/quests/index.ts";
import { initSecretsTable } from "../core/secrets/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createEntity } from "./entity.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  initSecretsTable(db);
  initPackTables(db);
  initQuestTables(db);
  initHowlTables(db);
  ensureMandatorySouls(db);
});

afterEach(() => {
  db.close();
});

let lastSystemPrompt = "";

function mockChatFactory(response: string) {
  return (model: string): ChatInstance => ({
    system(content: string) {
      lastSystemPrompt = content;
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
        cost: { estimatedUsd: 0.005 },
        model,
        iterations: 1,
        content: response,
        timing: { latencyMs: 200 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

describe("createEntity", () => {
  it("returns an entity with db, workspace, streamTurn, executeTurn", () => {
    const entity = createEntity({
      db,
      workspace: "/tmp/test",
      chatFactory: mockChatFactory("hi"),
    });
    strictEqual(entity.db, db);
    strictEqual(entity.workspace, "/tmp/test");
    ok(typeof entity.streamTurn === "function");
    ok(typeof entity.executeTurn === "function");
  });

  it("executeTurn returns a TurnResult", async () => {
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("hello back"),
    });
    const session = createSession(db, "test:entity:1", { purpose: "chat" });
    const result = await entity.executeTurn(session.id, "hello");

    strictEqual(result.content, "hello back");
    ok(result.messageId > 0);
    strictEqual(result.usage.inputTokens, 100);
    strictEqual(result.usage.outputTokens, 50);
    strictEqual(result.cost.estimatedUsd, 0.005);
    ok(result.iterations >= 1);
  });

  it("streamTurn yields chunks and returns TurnResult", async () => {
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("streamed"),
    });
    const session = createSession(db, "test:entity:2", { purpose: "chat" });

    const gen = entity.streamTurn(session.id, "hello");
    let chunks = "";
    let result: TurnResult | undefined;
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        result = next.value;
        break;
      }
      chunks += next.value;
    }

    ok(result);
    strictEqual(result.content, "streamed");
    strictEqual(chunks, "streamed");
  });

  it("system prompt includes soul essence", async () => {
    lastSystemPrompt = "";
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:3", { purpose: "chat" });
    await entity.executeTurn(session.id, "hello");

    ok(lastSystemPrompt.includes("Ghostpaw"));
    ok(lastSystemPrompt.includes("coordinator"));
  });

  it("system prompt includes environment section", async () => {
    lastSystemPrompt = "";
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:4", { purpose: "chat" });
    await entity.executeTurn(session.id, "hello");

    ok(lastSystemPrompt.includes("## Environment"));
    ok(lastSystemPrompt.includes("Current date:"));
  });

  it("uses configured model from config when no override", async () => {
    setConfig(db, "default_model", "custom-model", "cli");
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:5", { purpose: "chat" });
    const result = await entity.executeTurn(session.id, "hello");

    strictEqual(result.model, "custom-model");
  });

  it("uses override model when provided", async () => {
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:6", { purpose: "chat" });
    const result = await entity.executeTurn(session.id, "hello", { model: "override-model" });

    strictEqual(result.model, "override-model");
  });

  it("fires onTitleGenerated callback for first turn", async () => {
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("My Title"),
    });
    const session = createSession(db, "test:entity:7", { purpose: "chat" });

    let generatedTitle: string | undefined;
    await entity.executeTurn(session.id, "hello", {
      onTitleGenerated: (t) => {
        generatedTitle = t;
      },
    });

    for (let i = 0; i < 20 && !generatedTitle; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    ok(generatedTitle, "title should have been generated");
  });

  it("does not fire onTitleGenerated for subsequent turns", async () => {
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:8", { purpose: "chat" });

    await entity.executeTurn(session.id, "first message");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }

    let called = false;
    await entity.executeTurn(session.id, "second message", {
      onTitleGenerated: () => {
        called = true;
      },
    });

    await new Promise((r) => setTimeout(r, 200));
    strictEqual(called, false);
  });

  it("works with empty memory", async () => {
    lastSystemPrompt = "";
    const entity = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockChatFactory("ok"),
    });
    const session = createSession(db, "test:entity:9", { purpose: "chat" });
    await entity.executeTurn(session.id, "hello");

    ok(!lastSystemPrompt.includes("## Known Context"));
    ok(lastSystemPrompt.includes("## Tools"));
  });
});
