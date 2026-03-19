import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { shortSentenceRatio } from "./short_sentence_ratio.ts";

describe("shortSentenceRatio", () => {
  it("classifies short sentences correctly", () => {
    const ratio = shortSentenceRatio(["I am.", "This is a very long sentence indeed."]);
    ok(Math.abs(ratio - 0.5) < 1e-10);
  });

  it("returns 0 when all sentences are long", () => {
    strictEqual(shortSentenceRatio(["This sentence has more than five words in it."]), 0);
  });

  it("returns 1 when all sentences are short", () => {
    strictEqual(shortSentenceRatio(["One two.", "Three four."]), 1);
  });

  it("respects custom threshold", () => {
    strictEqual(shortSentenceRatio(["One two three."], 2), 0);
    strictEqual(shortSentenceRatio(["One two three."], 3), 1);
  });
});
