import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import type { ChatFactory } from "../../core/chat/index.ts";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { Entity } from "../../harness/index.ts";
import { createEntity } from "../../harness/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleRunStream } from "./handle_run_stream.ts";

let db: DatabaseHandle;
let entity: Entity;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
  initChatTables(db);
  initMemoryTable(db);
  initSoulsTables(db);
  ensureMandatorySouls(db);
  entity = createEntity({
    db,
    workspace: "/tmp",
    chatFactory: mockFactory("Hello there!", ["Hello", " there", "!"]),
  });
});

afterEach(() => {
  db.close();
});

function mockFactory(response: string, chunks?: string[]): ChatFactory {
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
      for (const chunk of chunks ?? [response]) {
        yield chunk;
      }
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

describe("handleRunStream", () => {
  it("yields chunks and returns RunResult", async () => {
    const gen = handleRunStream(entity, { prompt: "hello", model: "gpt-4o" });

    const chunks: string[] = [];
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        const result = next.value;
        strictEqual(result.content, "Hello there!");
        strictEqual(result.totalTokens, 150);
        break;
      }
      chunks.push(next.value);
    }

    strictEqual(chunks.length, 3);
    strictEqual(chunks.join(""), "Hello there!");
  });

  it("closes the session after streaming completes", async () => {
    const gen = handleRunStream(entity, { prompt: "hello", model: "gpt-4o" });
    for (;;) {
      const next = await gen.next();
      if (next.done) break;
    }
    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    ok(rows.length >= 1);
    const closed = rows.find((r) => r.closed_at !== null);
    ok(closed);
  });

  it("closes the session when consumer abandons the generator early", async () => {
    const e = createEntity({
      db,
      workspace: "/tmp",
      chatFactory: mockFactory("abc", ["a", "b", "c"]),
    });
    const gen = handleRunStream(e, { prompt: "hello", model: "gpt-4o" });

    const first = await gen.next();
    ok(!first.done);
    strictEqual(first.value, "a");

    await gen.return(undefined as never);

    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    ok(rows.length >= 1);
    const closed = rows.find((r) => r.closed_at !== null);
    ok(closed);
  });
});
