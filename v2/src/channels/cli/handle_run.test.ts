import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import type { ChatFactory } from "../../core/chat/index.ts";
import { initChatTables } from "../../core/chat/index.ts";
import { setConfig } from "../../core/config/api/write/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { Entity } from "../../harness/index.ts";
import { createEntity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleRun } from "./handle_run.ts";

let db: DatabaseHandle;
let entity: Entity;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
  initChatTables(db);
  initMemoryTable(db);
  initSoulsTables(db);
  ensureMandatorySouls(db);
  entity = createEntity({ db, workspace: "/tmp", chatFactory: mockFactory("Hi there!") });
});

afterEach(() => {
  db.close();
});

function mockFactory(response: string): ChatFactory {
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
        cost: { estimatedUsd: 0.005 },
        model: "gpt-4o",
        iterations: 1,
        content: response,
        timing: { latencyMs: 200 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

describe("handleRun", () => {
  it("returns a RunResult with the response content", async () => {
    const result = await handleRun(entity, { prompt: "hello", model: "gpt-4o" });
    strictEqual(result.content, "Hi there!");
    strictEqual(result.model, "gpt-4o");
    strictEqual(result.tokensIn, 100);
    strictEqual(result.tokensOut, 50);
    strictEqual(result.totalTokens, 150);
  });

  it("uses the configured default model when no override provided", async () => {
    setConfig(db, "default_model", "custom-model", "cli", "string");
    let usedModel = "";
    const factory: ChatFactory = (model: string) => {
      usedModel = model;
      return mockFactory("ok")(model);
    };
    const e = createEntity({ db, workspace: "/tmp", chatFactory: factory });
    await handleRun(e, { prompt: "test" });
    strictEqual(usedModel, "custom-model");
  });

  it("prefers the explicit model over config default", async () => {
    setConfig(db, "default_model", "config-model", "cli", "string");
    let usedModel = "";
    const factory: ChatFactory = (model: string) => {
      usedModel = model;
      return mockFactory("ok")(model);
    };
    const e = createEntity({ db, workspace: "/tmp", chatFactory: factory });
    await handleRun(e, { prompt: "test", model: "explicit-model" });
    strictEqual(usedModel, "explicit-model");
  });

  it("closes the session after execution", async () => {
    await handleRun(entity, { prompt: "hello", model: "gpt-4o" });
    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    ok(rows.length >= 1);
    const runSession = rows.find((r) => r.closed_at !== null);
    ok(runSession);
  });

  it("system prompt includes the soul identity", async () => {
    const systemCalls: string[] = [];
    const factory: ChatFactory = (_model: string): ChatInstance => ({
      system(content: string) {
        systemCalls.push(content);
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
        return "ok";
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
          cost: { estimatedUsd: 0.001 },
          model: "gpt-4o",
          iterations: 1,
          content: "ok",
          timing: { latencyMs: 100 },
          provider: "openai" as const,
          cached: false,
        };
      },
    });
    const e = createEntity({ db, workspace: "/tmp", chatFactory: factory });
    await handleRun(e, { prompt: "test", model: "gpt-4o" });
    ok(systemCalls.some((s) => s.includes("Ghostpaw")));
  });
});
