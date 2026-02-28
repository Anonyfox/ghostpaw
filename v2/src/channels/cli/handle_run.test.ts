import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import type { ChatFactory } from "../../core/chat/index.ts";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleRun } from "./handle_run.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
  initChatTables(db);
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
    const result = await handleRun(db, {
      prompt: "hello",
      model: "gpt-4o",
      createChat: mockFactory("Hi there!"),
    });
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
    await handleRun(db, { prompt: "test", createChat: factory });
    strictEqual(usedModel, "custom-model");
  });

  it("prefers the explicit model over config default", async () => {
    setConfig(db, "default_model", "config-model", "cli", "string");
    let usedModel = "";
    const factory: ChatFactory = (model: string) => {
      usedModel = model;
      return mockFactory("ok")(model);
    };
    await handleRun(db, { prompt: "test", model: "explicit-model", createChat: factory });
    strictEqual(usedModel, "explicit-model");
  });

  it("closes the session after execution", async () => {
    await handleRun(db, {
      prompt: "hello",
      model: "gpt-4o",
      createChat: mockFactory("response"),
    });
    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    strictEqual(rows.length, 1);
    ok(rows[0]!.closed_at !== null);
  });

  it("passes the system prompt to the turn", async () => {
    let receivedSystem = "";
    const factory: ChatFactory = (_model: string): ChatInstance => ({
      system(content: string) {
        receivedSystem = content;
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
      async generate() {
        return "ok";
      },
      async *stream() {
        yield "ok";
      },
      get lastResult() {
        return null;
      },
    });
    await handleRun(db, {
      prompt: "test",
      model: "gpt-4o",
      systemPrompt: "Custom system prompt",
      createChat: factory,
    });
    strictEqual(receivedSystem, "Custom system prompt");
  });
});
