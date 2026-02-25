import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { BudgetExceededError } from "../lib/errors.js";
import { createBudgetTracker, estimateTokens } from "./cost.js";

describe("estimateTokens", () => {
  it("returns a positive number for non-empty text", () => {
    ok(estimateTokens("hello world") > 0);
  });

  it("returns 0 for empty string", () => {
    strictEqual(estimateTokens(""), 0);
  });

  it("approximates ~4 chars per token", () => {
    const text = "a".repeat(400);
    const tokens = estimateTokens(text);
    ok(tokens >= 80 && tokens <= 120, `Expected ~100 tokens, got ${tokens}`);
  });

  it("handles multi-line text", () => {
    const text = "line one\nline two\nline three\nline four\n";
    ok(estimateTokens(text) > 5);
  });

  it("handles unicode text", () => {
    const text = "こんにちは世界 🌍";
    ok(estimateTokens(text) > 0);
  });

  it("accounts for code-like content (higher token density)", () => {
    const code = "function f(x: number): number { return x * 2; }";
    const prose = "The quick brown fox jumps over the lazy dog again";
    ok(estimateTokens(code) >= estimateTokens(prose) * 0.5);
  });
});

describe("BudgetTracker", () => {
  it("starts with zero usage", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    const usage = tracker.getUsage();
    strictEqual(usage.sessionTokensIn, 0);
    strictEqual(usage.sessionTokensOut, 0);
    strictEqual(usage.dayTokensIn, 0);
    strictEqual(usage.dayTokensOut, 0);
  });

  it("records token usage", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(500, 200);
    const usage = tracker.getUsage();
    strictEqual(usage.sessionTokensIn, 500);
    strictEqual(usage.sessionTokensOut, 200);
    strictEqual(usage.dayTokensIn, 500);
    strictEqual(usage.dayTokensOut, 200);
  });

  it("accumulates across multiple record calls", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(100, 50);
    tracker.record(200, 100);
    tracker.record(300, 150);
    const usage = tracker.getUsage();
    strictEqual(usage.sessionTokensIn, 600);
    strictEqual(usage.sessionTokensOut, 300);
    strictEqual(usage.sessionTotal, 900);
    strictEqual(usage.dayTotal, 900);
  });

  it("computes percentage correctly", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 1000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(400, 100);
    const usage = tracker.getUsage();
    strictEqual(usage.sessionPercentage, 50);
  });

  it("returns isWarning when above threshold", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 1000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(800, 50);
    const usage = tracker.getUsage();
    ok(usage.isWarning);
  });

  it("returns not isWarning when below threshold", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 1000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(100, 50);
    ok(!tracker.getUsage().isWarning);
  });

  it("checkBudget throws BudgetExceededError when session limit exceeded", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 100,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(80, 30);
    throws(
      () => tracker.checkBudget(),
      (err: unknown) => {
        ok(err instanceof BudgetExceededError);
        strictEqual(err.usage, 110);
        strictEqual(err.limit, 100);
        return true;
      },
    );
  });

  it("checkBudget throws when day limit exceeded", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 100_000,
      maxTokensPerDay: 500,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(300, 250);
    throws(
      () => tracker.checkBudget(),
      (err: unknown) => {
        ok(err instanceof BudgetExceededError);
        return true;
      },
    );
  });

  it("checkBudget does not throw when within limits", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(100, 50);
    tracker.checkBudget();
  });

  it("resetSession clears session counters but keeps day counters", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(500, 200);
    tracker.resetSession();
    const usage = tracker.getUsage();
    strictEqual(usage.sessionTokensIn, 0);
    strictEqual(usage.sessionTokensOut, 0);
    strictEqual(usage.dayTokensIn, 500);
    strictEqual(usage.dayTokensOut, 200);
  });

  it("produces a human-readable summary", () => {
    const tracker = createBudgetTracker({
      maxTokensPerSession: 10_000,
      maxTokensPerDay: 100_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
    });
    tracker.record(1234, 567);
    const summary = tracker.formatSummary();
    ok(summary.includes("1234"));
    ok(summary.includes("567"));
    ok(summary.includes("10000") || summary.includes("10,000"));
  });
});
