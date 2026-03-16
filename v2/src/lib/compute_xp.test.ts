import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { computeSessionXP } from "./compute_xp.ts";

const base = {
  tokensIn: 0,
  tokensOut: 0,
  reasoningTokens: 0,
  uniqueToolCount: 0,
  durationMs: 0,
};

describe("computeSessionXP", () => {
  it("returns 0 for zero tokens", () => {
    strictEqual(computeSessionXP({ ...base, durationMs: 60_000 }), 0);
  });

  it("returns 0 for zero duration", () => {
    strictEqual(computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 0 }), 0);
  });

  it("scales logarithmically with token count", () => {
    const low = computeSessionXP({ ...base, tokensIn: 1_000, durationMs: 300_000 });
    const mid = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 300_000 });
    const high = computeSessionXP({ ...base, tokensIn: 100_000, durationMs: 300_000 });
    ok(mid > low, "mid > low");
    ok(high > mid, "high > mid");
    ok(high / low < 3, "logarithmic: 100x tokens gives less than 3x XP");
  });

  it("increases with tool diversity", () => {
    const noTools = computeSessionXP({
      ...base,
      tokensIn: 10_000,
      durationMs: 300_000,
      uniqueToolCount: 0,
    });
    const fiveTools = computeSessionXP({
      ...base,
      tokensIn: 10_000,
      durationMs: 300_000,
      uniqueToolCount: 5,
    });
    const tenTools = computeSessionXP({
      ...base,
      tokensIn: 10_000,
      durationMs: 300_000,
      uniqueToolCount: 10,
    });
    ok(fiveTools > noTools, "5 tools > 0 tools");
    ok(tenTools > fiveTools, "10 tools > 5 tools");
  });

  it("caps diversity factor at 1.5", () => {
    const ten = computeSessionXP({
      ...base,
      tokensIn: 10_000,
      durationMs: 300_000,
      uniqueToolCount: 10,
    });
    const twenty = computeSessionXP({
      ...base,
      tokensIn: 10_000,
      durationMs: 300_000,
      uniqueToolCount: 20,
    });
    strictEqual(ten, twenty);
  });

  it("increases with duration (diminishing returns)", () => {
    const short = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 60_000 });
    const medium = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 1_800_000 });
    const long = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 3_600_000 });
    ok(medium > short, "30m > 1m");
    ok(long > medium, "60m > 30m");
    ok(long - medium < medium - short, "diminishing returns");
  });

  it("caps duration factor at 2.0", () => {
    const oneHour = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 3_600_000 });
    const tenHours = computeSessionXP({ ...base, tokensIn: 10_000, durationMs: 36_000_000 });
    ok(tenHours <= oneHour * 2.5, "10h is not dramatically more than 1h");
  });

  it("produces ~100 XP for heavy focused work", () => {
    const xp = computeSessionXP({
      tokensIn: 30_000,
      tokensOut: 20_000,
      reasoningTokens: 0,
      uniqueToolCount: 6,
      durationMs: 3_600_000,
    });
    ok(xp > 80, `expected ~100+ XP for heavy work, got ${xp}`);
    ok(xp < 200, `expected < 200 XP for heavy work, got ${xp}`);
  });

  it("includes reasoning tokens in the base", () => {
    const without = computeSessionXP({
      ...base,
      tokensIn: 5_000,
      tokensOut: 5_000,
      durationMs: 600_000,
    });
    const with_ = computeSessionXP({
      ...base,
      tokensIn: 5_000,
      tokensOut: 5_000,
      reasoningTokens: 10_000,
      durationMs: 600_000,
    });
    ok(with_ > without, "reasoning tokens increase XP");
  });
});
