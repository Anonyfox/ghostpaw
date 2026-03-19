import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { freshness } from "./freshness.ts";

const MS_PER_DAY = 86_400_000;

describe("freshness", () => {
  it("returns 1.0 when age is zero", () => {
    const now = Date.now();
    strictEqual(freshness(now, 1, now), 1);
  });

  it("returns 1.0 when verified_at is in the future", () => {
    const now = Date.now();
    strictEqual(freshness(now + MS_PER_DAY, 1, now), 1);
  });

  it("returns 0 when evidence count is zero", () => {
    const now = Date.now();
    strictEqual(freshness(now - MS_PER_DAY * 10, 0, now), 0);
  });

  it("returns 0 when evidence count is negative", () => {
    const now = Date.now();
    strictEqual(freshness(now - MS_PER_DAY * 10, -1, now), 0);
  });

  it("decays over time with evidence=1, halfLife=90", () => {
    const now = Date.now();
    const at90days = freshness(now - MS_PER_DAY * 90, 1, now);
    const expected = Math.exp(-1);
    ok(Math.abs(at90days - expected) < 1e-10, `expected ~${expected}, got ${at90days}`);
  });

  it("higher evidence slows decay", () => {
    const now = Date.now();
    const age = MS_PER_DAY * 180;
    const low = freshness(now - age, 1, now);
    const high = freshness(now - age, 9, now);
    ok(high > low, `evidence=9 (${high}) should decay slower than evidence=1 (${low})`);
  });

  it("respects custom halfLife", () => {
    const now = Date.now();
    const age = MS_PER_DAY * 30;
    const short = freshness(now - age, 1, now, 30);
    const long = freshness(now - age, 1, now, 365);
    ok(long > short, `halfLife=365 (${long}) should be fresher than halfLife=30 (${short})`);
  });

  it("very old memory with low evidence approaches zero", () => {
    const now = Date.now();
    const ancient = freshness(now - MS_PER_DAY * 3650, 1, now);
    ok(ancient < 0.001, `expected near-zero, got ${ancient}`);
  });

  it("very old memory with high evidence retains some freshness", () => {
    const now = Date.now();
    const resilient = freshness(now - MS_PER_DAY * 365, 100, now);
    ok(resilient > 0.5, `expected >0.5 with evidence=100 at 1 year, got ${resilient}`);
  });

  it("returns 0 when halfLifeDays is zero", () => {
    const now = Date.now();
    strictEqual(freshness(now - MS_PER_DAY, 1, now, 0), 0);
  });

  it("returns 0 when halfLifeDays is negative", () => {
    const now = Date.now();
    strictEqual(freshness(now - MS_PER_DAY, 1, now, -10), 0);
  });
});
