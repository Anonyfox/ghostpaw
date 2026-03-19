import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "preact-render-to-string";
import { CostDailyTrend } from "./cost_daily_trend.tsx";

describe("CostDailyTrend", () => {
  it("renders daily trend table", () => {
    const html = renderToString(
      <CostDailyTrend
        daily={[
          { date: "2026-03-03", costUsd: 0.42, tokens: 45350, sessionCount: 6 },
          { date: "2026-03-02", costUsd: 1.23, tokens: 128400, sessionCount: 14 },
        ]}
      />,
    );
    ok(html.includes("Daily Trend"));
    ok(html.includes("Today"));
    ok(html.includes("Yesterday"));
    ok(html.includes("$0.42"));
    ok(html.includes("$1.23"));
  });

  it("formats dates after yesterday", () => {
    const html = renderToString(
      <CostDailyTrend
        daily={[
          { date: "2026-03-03", costUsd: 0, tokens: 0, sessionCount: 0 },
          { date: "2026-03-02", costUsd: 0, tokens: 0, sessionCount: 0 },
          { date: "2026-03-01", costUsd: 0.08, tokens: 8200, sessionCount: 3 },
        ]}
      />,
    );
    ok(html.includes("Mar 1"));
  });

  it("returns null when empty", () => {
    const html = renderToString(<CostDailyTrend daily={[]} />);
    strictEqual(html, "");
  });

  it("applies muted style for zero-cost days", () => {
    const html = renderToString(
      <CostDailyTrend daily={[{ date: "2026-03-03", costUsd: 0, tokens: 0, sessionCount: 0 }]} />,
    );
    ok(html.includes("text-body-tertiary"));
  });
});
