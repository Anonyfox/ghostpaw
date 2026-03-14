import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { TurnResult } from "../../core/chat/api/write/index.ts";
import { toRunResult } from "./to_run_result.ts";

describe("toRunResult", () => {
  it("maps TurnResult fields to RunResult", () => {
    const turn: TurnResult = {
      succeeded: true,
      messageId: 1,
      content: "Hello!",
      model: "gpt-4o",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 10,
        cachedTokens: 0,
        totalTokens: 150,
      },
      cost: { estimatedUsd: 0.005 },
      iterations: 1,
    };
    const result = toRunResult(turn);
    strictEqual(result.content, "Hello!");
    strictEqual(result.model, "gpt-4o");
    strictEqual(result.tokensIn, 100);
    strictEqual(result.tokensOut, 50);
    strictEqual(result.totalTokens, 150);
  });

  it("excludes TurnResult-specific fields from output", () => {
    const turn: TurnResult = {
      succeeded: true,
      messageId: 42,
      content: "test",
      model: "m",
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      },
      cost: { estimatedUsd: 0 },
      iterations: 3,
    };
    const result = toRunResult(turn);
    strictEqual("messageId" in result, false);
    strictEqual("cost" in result, false);
    strictEqual("iterations" in result, false);
  });
});
