import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { DelegationStats } from "./delegation_stats.ts";

describe("DelegationStats", () => {
  it("structure is assignable from a well-formed object", () => {
    const stats: DelegationStats = {
      total: 10,
      completed: 8,
      failed: 2,
      avgCostUsd: 0.01,
      totalCostUsd: 0.1,
      totalTokensIn: 1000,
      totalTokensOut: 500,
    };
    ok(stats.total > 0);
  });
});
