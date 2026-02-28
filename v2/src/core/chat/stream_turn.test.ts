import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { ChatInstance, TurnContext } from "./chat_instance.ts";
import { createSession } from "./create_session.ts";
import { getHistory } from "./get_history.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";
import { streamTurn } from "./stream_turn.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function createMockFactory(chunks: string[], opts?: { shouldThrow?: boolean }) {
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
      return chunks.join("");
    },
    async *stream() {
      for (const chunk of chunks) {
        if (opts?.shouldThrow) throw new Error("stream failure");
        yield chunk;
      }
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
        cost: { estimatedUsd: 0.003 },
        model: "gpt-4o",
        iterations: 1,
        content: chunks.join(""),
        timing: { latencyMs: 150 },
        provider: "openai" as const,
        cached: false,
      };
    },
  });
}

function makeCtx(chunks: string[], opts?: { shouldThrow?: boolean }): TurnContext {
  return {
    db,
    tools: [],
    createChat: createMockFactory(chunks, opts),
  };
}

async function collectStream(
  gen: AsyncGenerator<string, unknown>,
): Promise<{ chunks: string[]; result: unknown }> {
  const chunks: string[] = [];
  let done = false;
  let result: unknown;
  while (!done) {
    const next = await gen.next();
    if (next.done) {
      done = true;
      result = next.value;
    } else {
      chunks.push(next.value);
    }
  }
  return { chunks, result };
}

describe("streamTurn", () => {
  it("yields chunks and returns TurnResult", async () => {
    const session = createSession(db, "k");
    const gen = streamTurn(
      { sessionId: session.id, content: "hello", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["Hello", " there", "!"]),
    );
    const { chunks, result } = await collectStream(gen);
    deepStrictEqual(chunks, ["Hello", " there", "!"]);
    ok(result);
    const tr = result as { content: string; messageId: number };
    strictEqual(tr.content, "Hello there!");
    ok(tr.messageId > 0);
  });

  it("persists user and assistant messages", async () => {
    const session = createSession(db, "k");
    const gen = streamTurn(
      { sessionId: session.id, content: "hi", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["response"]),
    );
    await collectStream(gen);
    const history = getHistory(db, session.id);
    strictEqual(history.length, 2);
    strictEqual(history[0]!.role, "user");
    strictEqual(history[1]!.role, "assistant");
    strictEqual(history[1]!.content, "response");
  });

  it("updates session totals", async () => {
    const session = createSession(db, "k");
    const gen = streamTurn(
      { sessionId: session.id, content: "hi", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["response"]),
    );
    await collectStream(gen);
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.tokensIn, 80);
    strictEqual(updated.tokensOut, 40);
  });

  it("handles stream errors gracefully", async () => {
    const session = createSession(db, "k");
    const gen = streamTurn(
      { sessionId: session.id, content: "hello", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["chunk"], { shouldThrow: true }),
    );
    const { chunks, result } = await collectStream(gen);
    strictEqual(chunks.length, 0);
    const tr = result as { content: string };
    ok(tr.content.startsWith("Error:"));
  });

  it("throws for non-existent session", async () => {
    const gen = streamTurn(
      { sessionId: 99999, content: "hello", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["response"]),
    );
    await rejects(() => gen.next(), /not found/i);
  });

  it("releases the session lock after completion", async () => {
    const session = createSession(db, "k");
    const gen1 = streamTurn(
      { sessionId: session.id, content: "first", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["r1"]),
    );
    await collectStream(gen1);
    const gen2 = streamTurn(
      { sessionId: session.id, content: "second", systemPrompt: "sys", model: "gpt-4o" },
      makeCtx(["r2"]),
    );
    const { result } = await collectStream(gen2);
    const tr = result as { content: string };
    strictEqual(tr.content, "r2");
    const history = getHistory(db, session.id);
    strictEqual(history.length, 4);
  });
});
