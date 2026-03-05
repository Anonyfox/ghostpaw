import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { sentenceLengthStats } from "./sentence_length_stats.ts";

describe("sentenceLengthStats", () => {
  it("computes correct mean", () => {
    const stats = sentenceLengthStats(["One two.", "One two three four."]);
    strictEqual(stats.mean, 3);
  });

  it("computes near-zero stdDev for uniform lengths", () => {
    const stats = sentenceLengthStats(["A B C.", "D E F.", "G H I."]);
    ok(stats.stdDev < 0.01);
  });

  it("computes nonzero stdDev for varied lengths", () => {
    const stats = sentenceLengthStats([
      "Short.",
      "This is a much longer sentence with many words in it.",
    ]);
    ok(stats.stdDev > 0);
  });

  it("handles empty input", () => {
    const stats = sentenceLengthStats([]);
    strictEqual(stats.mean, 0);
    strictEqual(stats.stdDev, 0);
  });
});
