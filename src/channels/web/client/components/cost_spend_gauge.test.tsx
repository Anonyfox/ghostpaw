import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "preact-render-to-string";
import { CostSpendGauge } from "./cost_spend_gauge.tsx";

const baseSummary = {
  costUsd: 0.42,
  tokensIn: 30000,
  tokensOut: 15000,
  reasoningTokens: 0,
  cachedTokens: 0,
  sessionCount: 3,
};

describe("CostSpendGauge", () => {
  it("renders today spend amount", () => {
    const html = renderToString(
      <CostSpendGauge
        today={baseSummary}
        limit={{ maxCostPerDay: 5, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("$0.42"));
    ok(html.includes("today"));
  });

  it("shows progress bar with limit", () => {
    const html = renderToString(
      <CostSpendGauge
        today={baseSummary}
        limit={{ maxCostPerDay: 5, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("progress-bar"));
    ok(html.includes("bg-success"));
  });

  it("shows no limit text when unlimited", () => {
    const html = renderToString(
      <CostSpendGauge
        today={baseSummary}
        limit={{ maxCostPerDay: 0, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("no limit"));
    ok(!html.includes("progress-bar"));
  });

  it("shows warning state when near limit", () => {
    const html = renderToString(
      <CostSpendGauge
        today={{ ...baseSummary, costUsd: 4.5 }}
        limit={{ maxCostPerDay: 5, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("bg-warning"));
    ok(html.includes("approaching limit"));
  });

  it("shows danger state at limit", () => {
    const html = renderToString(
      <CostSpendGauge
        today={{ ...baseSummary, costUsd: 5.01 }}
        limit={{ maxCostPerDay: 5, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("bg-danger"));
    ok(html.includes("limit reached"));
  });

  it("renders edit limit button", () => {
    const html = renderToString(
      <CostSpendGauge
        today={baseSummary}
        limit={{ maxCostPerDay: 5, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("Edit limit"));
  });

  it("renders set limit button when no limit", () => {
    const html = renderToString(
      <CostSpendGauge
        today={baseSummary}
        limit={{ maxCostPerDay: 0, warnAtPercentage: 80 }}
        onLimitChange={() => {}}
      />,
    );
    ok(html.includes("Set limit"));
  });
});
