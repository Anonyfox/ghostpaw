import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { estimateTokens } from "./estimate_tokens.ts";

describe("estimateTokens", () => {
  it("returns approximate token count for normal text", () => {
    strictEqual(estimateTokens("abcd"), 1);
    strictEqual(estimateTokens("abcdefgh"), 2);
    strictEqual(estimateTokens("hello world!"), 3);
  });

  it("returns 0 for an empty string", () => {
    strictEqual(estimateTokens(""), 0);
  });

  it("rounds up partial tokens", () => {
    strictEqual(estimateTokens("abc"), 1);
    strictEqual(estimateTokens("abcde"), 2);
  });

  it("handles unicode characters", () => {
    const emoji = "🦊🐺💜";
    strictEqual(estimateTokens(emoji), Math.ceil(emoji.length / 4));
  });

  it("handles very long strings", () => {
    const long = "a".repeat(100_000);
    strictEqual(estimateTokens(long), 25_000);
  });

  it("handles single character", () => {
    strictEqual(estimateTokens("x"), 1);
  });

  it("handles exactly four characters", () => {
    strictEqual(estimateTokens("abcd"), 1);
  });
});
