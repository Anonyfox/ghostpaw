import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateTokens } from "./estimate_tokens.ts";

describe("estimateTokens", () => {
  it("returns approximate token count (~1 per 4 chars)", () => {
    const text = "Hello, world! This is a test.";
    const result = estimateTokens(text);
    ok(result > 0);
    strictEqual(result, Math.ceil(text.length / 4));
  });

  it("returns 0 for empty string", () => {
    strictEqual(estimateTokens(""), 0);
  });
});
