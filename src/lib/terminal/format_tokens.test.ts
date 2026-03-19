import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { formatTokens } from "./format_tokens.ts";

describe("formatTokens", () => {
  it("formats small numbers as-is", () => {
    strictEqual(formatTokens(42), "~42 tokens");
  });

  it("formats exactly 999 without k suffix", () => {
    strictEqual(formatTokens(999), "~999 tokens");
  });

  it("formats 1000 with k suffix", () => {
    strictEqual(formatTokens(1000), "~1.0k tokens");
  });

  it("formats large numbers with one decimal", () => {
    strictEqual(formatTokens(1500), "~1.5k tokens");
    strictEqual(formatTokens(12345), "~12.3k tokens");
    strictEqual(formatTokens(100000), "~100.0k tokens");
  });

  it("formats zero", () => {
    strictEqual(formatTokens(0), "~0 tokens");
  });
});
