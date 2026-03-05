import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { RunInput, RunResult } from "./run_types.ts";

describe("run_types", () => {
  it("RunInput is satisfiable with required fields only", () => {
    const input: RunInput = { prompt: "hello" };
    strictEqual(input.prompt, "hello");
    strictEqual(input.model, undefined);
  });

  it("RunInput accepts optional model", () => {
    const input: RunInput = { prompt: "test", model: "gpt-4o" };
    strictEqual(input.model, "gpt-4o");
  });

  it("RunResult is satisfiable", () => {
    const result: RunResult = {
      succeeded: true,
      content: "hi",
      model: "gpt-4o",
      tokensIn: 100,
      tokensOut: 50,
      totalTokens: 150,
    };
    strictEqual(result.content, "hi");
    strictEqual(result.totalTokens, result.tokensIn + result.tokensOut);
  });
});
