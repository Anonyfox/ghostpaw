import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CostsByModel,
  CostsByPurpose,
  CostsBySoul,
  CostsDailyEntry,
  CostsResponse,
} from "./cost_types.ts";

describe("cost shared types", () => {
  it("CostsResponse is structurally valid", () => {
    const res: CostsResponse = {
      today: {
        costUsd: 0.42,
        tokensIn: 30000,
        tokensOut: 15000,
        reasoningTokens: 2000,
        cachedTokens: 5000,
        sessionCount: 3,
      },
      limit: { maxCostPerDay: 5, warnAtPercentage: 80 },
      byModel: [],
      bySoul: [],
      byPurpose: [],
      daily: [],
    };
    ok(res.today.costUsd > 0);
  });

  it("CostsByModel is structurally valid", () => {
    const entry: CostsByModel = {
      model: "claude-sonnet-4-6",
      costUsd: 0.38,
      tokens: 42150,
      calls: 12,
    };
    ok(entry.calls > 0);
  });

  it("CostsBySoul is structurally valid", () => {
    const entry: CostsBySoul = { soul: "Ghostpaw", costUsd: 0.22, runs: 8, avgCostUsd: 0.028 };
    ok(entry.runs > 0);
  });

  it("CostsByPurpose is structurally valid", () => {
    const entry: CostsByPurpose = { purpose: "chat", costUsd: 0.3, sessionCount: 3 };
    ok(entry.sessionCount > 0);
  });

  it("CostsDailyEntry is structurally valid", () => {
    const entry: CostsDailyEntry = {
      date: "2026-03-03",
      costUsd: 0.42,
      tokens: 45350,
      sessionCount: 6,
    };
    ok(entry.date.length === 10);
  });
});
