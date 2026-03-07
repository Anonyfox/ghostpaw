import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSpendStatus, isSpendBlocked } from "./spend_status.ts";

describe("computeSpendStatus", () => {
  it("returns zero spend when nothing spent", () => {
    const status = computeSpendStatus(0, 5.0, 86_400_000);
    strictEqual(status.spent, 0);
    strictEqual(status.limit, 5.0);
    strictEqual(status.remaining, 5.0);
    strictEqual(status.percentage, 0);
    strictEqual(status.isBlocked, false);
    strictEqual(status.windowMs, 86_400_000);
  });

  it("calculates correct percentage", () => {
    const status = computeSpendStatus(2.5, 5.0, 86_400_000);
    strictEqual(status.percentage, 50);
    strictEqual(status.isBlocked, false);
    ok(Math.abs(status.remaining - 2.5) < 0.001);
  });

  it("caps percentage at 100", () => {
    const status = computeSpendStatus(10.0, 5.0, 86_400_000);
    strictEqual(status.percentage, 100);
    strictEqual(status.isBlocked, true);
    strictEqual(status.remaining, 0);
  });

  it("returns infinite remaining when limit is zero", () => {
    const status = computeSpendStatus(10.0, 0, 86_400_000);
    strictEqual(status.limit, 0);
    strictEqual(status.remaining, Number.POSITIVE_INFINITY);
    strictEqual(status.percentage, 0);
    strictEqual(status.isBlocked, false);
  });

  it("treats negative limit as zero", () => {
    const status = computeSpendStatus(0, -3, 86_400_000);
    strictEqual(status.limit, 0);
    strictEqual(status.isBlocked, false);
  });

  it("rounds percentage to nearest integer", () => {
    const status = computeSpendStatus(1.0, 3.0, 86_400_000);
    strictEqual(status.percentage, 33);
  });
});

describe("isSpendBlocked", () => {
  it("returns false when limit is zero (unlimited)", () => {
    strictEqual(isSpendBlocked(100, 0), false);
  });

  it("returns false when limit is negative (unlimited)", () => {
    strictEqual(isSpendBlocked(100, -5), false);
  });

  it("returns false when spend is below limit", () => {
    strictEqual(isSpendBlocked(2.0, 5.0), false);
  });

  it("returns true when spend equals limit", () => {
    strictEqual(isSpendBlocked(5.0, 5.0), true);
  });

  it("returns true when spend exceeds limit", () => {
    strictEqual(isSpendBlocked(7.0, 5.0), true);
  });

  it("returns false when nothing spent", () => {
    strictEqual(isSpendBlocked(0, 5.0), false);
  });
});
