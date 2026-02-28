import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatInstance } from "../../core/chat/chat_instance.ts";
import type { ChatFactory } from "../../core/chat/index.ts";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleRunStream } from "./handle_run_stream.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
  initChatTables(db);
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
    const gen = handleRunStream(db, {
      prompt: "hello",
      model: "gpt-4o",
      createChat: mockFactory("Hello there!", ["Hello", " there", "!"]),
    });

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
    const gen = handleRunStream(db, {
      prompt: "hello",
      model: "gpt-4o",
      createChat: mockFactory("response"),
    });
    for (;;) {
      const next = await gen.next();
      if (next.done) break;
    }
    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    strictEqual(rows.length, 1);
    ok(rows[0]!.closed_at !== null);
  });

  it("closes the session when consumer abandons the generator early", async () => {
    const gen = handleRunStream(db, {
      prompt: "hello",
      model: "gpt-4o",
      createChat: mockFactory("abc", ["a", "b", "c"]),
    });

    const first = await gen.next();
    ok(!first.done);
    strictEqual(first.value, "a");

    await gen.return(undefined as never);

    const rows = db.prepare("SELECT closed_at FROM sessions").all() as { closed_at: unknown }[];
    strictEqual(rows.length, 1);
    ok(rows[0]!.closed_at !== null);
  });
});
