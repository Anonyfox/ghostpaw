import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { RunInput, RunResult } from "./run_types.ts";
import { DEFAULT_SYSTEM_PROMPT } from "./run_types.ts";

describe("run_types", () => {
  it("DEFAULT_SYSTEM_PROMPT is a non-empty string", () => {
    strictEqual(typeof DEFAULT_SYSTEM_PROMPT, "string");
    ok(DEFAULT_SYSTEM_PROMPT.length > 0);
  });

  it("RunInput is satisfiable with required fields", () => {
    const input: RunInput = {
      prompt: "hello",
      createChat: () => ({
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
          return "";
        },
        async *stream() {
          yield "";
        },
        get lastResult() {
          return null;
        },
      }),
    };
    strictEqual(input.prompt, "hello");
    strictEqual(input.model, undefined);
    strictEqual(input.systemPrompt, undefined);
  });

  it("RunResult is satisfiable", () => {
    const result: RunResult = {
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
