import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBudgetSummary } from "./format_budget_summary.ts";

describe("formatBudgetSummary", () => {
  it("returns a summary when session usage exceeds the warning threshold", () => {
    const result = formatBudgetSummary({
      sessionTokens: 160_000,
      sessionLimit: 200_000,
      dayTokens: 100_000,
      dayLimit: 1_000_000,
      warnAtPercentage: 80,
    });
    ok(result !== null);
    ok(result!.includes("Session:"));
    ok(result!.includes("80%"));
  });

  it("returns a summary when day usage exceeds the warning threshold", () => {
    const result = formatBudgetSummary({
      sessionTokens: 10_000,
      sessionLimit: 200_000,
      dayTokens: 850_000,
      dayLimit: 1_000_000,
      warnAtPercentage: 80,
    });
    ok(result !== null);
    ok(result!.includes("Day:"));
    ok(result!.includes("85%"));
  });

  it("returns null when both usages are below the threshold", () => {
    const result = formatBudgetSummary({
      sessionTokens: 10_000,
      sessionLimit: 200_000,
      dayTokens: 100_000,
      dayLimit: 1_000_000,
      warnAtPercentage: 80,
    });
    strictEqual(result, null);
  });

  it("returns null when limits are zero (unlimited)", () => {
    const result = formatBudgetSummary({
      sessionTokens: 999_999,
      sessionLimit: 0,
      dayTokens: 999_999,
      dayLimit: 0,
      warnAtPercentage: 80,
    });
    strictEqual(result, null);
  });

  it("includes both lines when both limits are active and one warns", () => {
    const result = formatBudgetSummary({
      sessionTokens: 180_000,
      sessionLimit: 200_000,
      dayTokens: 500_000,
      dayLimit: 1_000_000,
      warnAtPercentage: 80,
    });
    ok(result !== null);
    ok(result!.includes("Session:"));
    ok(result!.includes("Day:"));
  });

  it("omits a line when that limit is zero", () => {
    const result = formatBudgetSummary({
      sessionTokens: 180_000,
      sessionLimit: 200_000,
      dayTokens: 500_000,
      dayLimit: 0,
      warnAtPercentage: 80,
    });
    ok(result !== null);
    ok(result!.includes("Session:"));
    ok(!result!.includes("Day:"));
  });

  it("caps percentage at 100 when usage exceeds the limit", () => {
    const result = formatBudgetSummary({
      sessionTokens: 250_000,
      sessionLimit: 200_000,
      dayTokens: 0,
      dayLimit: 1_000_000,
      warnAtPercentage: 80,
    });
    ok(result !== null);
    ok(result!.includes("100%"));
  });

  it("triggers at exactly the threshold percentage", () => {
    const result = formatBudgetSummary({
      sessionTokens: 160_000,
      sessionLimit: 200_000,
      dayTokens: 0,
      dayLimit: 0,
      warnAtPercentage: 80,
    });
    ok(result !== null);
  });

  it("does not trigger just below the threshold", () => {
    const result = formatBudgetSummary({
      sessionTokens: 158_000,
      sessionLimit: 200_000,
      dayTokens: 0,
      dayLimit: 0,
      warnAtPercentage: 80,
    });
    strictEqual(result, null);
  });
});
