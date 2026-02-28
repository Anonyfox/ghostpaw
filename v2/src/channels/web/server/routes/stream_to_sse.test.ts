import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { TurnResult } from "../../../../core/chat/index.ts";
import { streamToSse } from "./stream_to_sse.ts";

const MOCK_RESULT: TurnResult = {
  messageId: 1,
  content: "hello world",
  model: "test-model",
  usage: { inputTokens: 10, outputTokens: 20, reasoningTokens: 0, totalTokens: 30 },
  cost: { estimatedUsd: 0.001 },
  iterations: 1,
};

function collectRes() {
  const chunks: string[] = [];
  return {
    write(data: string) {
      chunks.push(data);
      return true;
    },
    get chunks() {
      return chunks;
    },
    get raw() {
      return chunks.join("");
    },
  };
}

async function* fakeStream(texts: string[]): AsyncGenerator<string, TurnResult> {
  for (const t of texts) yield t;
  return MOCK_RESULT;
}

async function* failingStream(): AsyncGenerator<string, TurnResult> {
  yield "partial";
  throw new Error("LLM failure");
}

describe("streamToSse", () => {
  it("writes each chunk as SSE data event", async () => {
    const res = collectRes();
    // biome-ignore lint/suspicious/noExplicitAny: mock ServerResponse for testing
    await streamToSse(fakeStream(["hello", " world"]), res as any);
    ok(res.raw.includes('data: "hello"\n\n'));
    ok(res.raw.includes('data: " world"\n\n'));
  });

  it("writes done event with result metadata at the end", async () => {
    const res = collectRes();
    // biome-ignore lint/suspicious/noExplicitAny: mock ServerResponse for testing
    await streamToSse(fakeStream(["hi"]), res as any);
    ok(res.raw.includes("event: done\n"));
    const doneChunk = res.chunks.find((c) => c.startsWith("event: done"));
    ok(doneChunk);
    const dataLine = doneChunk!.split("\n").find((l) => l.startsWith("data: "));
    ok(dataLine);
    const payload = JSON.parse(dataLine!.slice(6));
    strictEqual(payload.model, "test-model");
    strictEqual(payload.usage.totalTokens, 30);
  });

  it("writes error event when generator throws", async () => {
    const res = collectRes();
    // biome-ignore lint/suspicious/noExplicitAny: mock ServerResponse for testing
    await streamToSse(failingStream(), res as any);
    ok(res.raw.includes("event: error\n"));
    ok(res.raw.includes("LLM failure"));
  });

  it("handles empty stream (no chunks before done)", async () => {
    const res = collectRes();
    // biome-ignore lint/suspicious/noExplicitAny: mock ServerResponse for testing
    await streamToSse(fakeStream([]), res as any);
    strictEqual(res.chunks.length, 1);
    ok(res.chunks[0]!.startsWith("event: done"));
  });
});
