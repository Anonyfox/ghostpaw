import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SpendStatus } from "./types.ts";

describe("SpendStatus", () => {
  it("defines all expected properties", () => {
    const status: SpendStatus = {
      spent: 1.5,
      limit: 5,
      remaining: 3.5,
      percentage: 30,
      isBlocked: false,
      windowMs: 86_400_000,
    };
    strictEqual(status.spent, 1.5);
    strictEqual(status.limit, 5);
    strictEqual(status.remaining, 3.5);
    strictEqual(status.percentage, 30);
    strictEqual(status.isBlocked, false);
    strictEqual(status.windowMs, 86_400_000);
  });

  it("represents a blocked state correctly", () => {
    const status: SpendStatus = {
      spent: 5.01,
      limit: 5,
      remaining: 0,
      percentage: 100,
      isBlocked: true,
      windowMs: 86_400_000,
    };
    ok(status.isBlocked);
    strictEqual(status.remaining, 0);
    strictEqual(status.percentage, 100);
  });
});
