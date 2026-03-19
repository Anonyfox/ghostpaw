import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "preact-render-to-string";
import { CostTokenSummary } from "./cost_token_summary.tsx";

describe("CostTokenSummary", () => {
  it("renders token stats", () => {
    const html = renderToString(
      <CostTokenSummary
        today={{
          costUsd: 0.42,
          tokensIn: 30000,
          tokensOut: 15000,
          reasoningTokens: 0,
          cachedTokens: 0,
          sessionCount: 3,
        }}
      />,
    );
    ok(html.includes("Total tokens"));
    ok(html.includes("45.0k"));
    ok(html.includes("Input"));
    ok(html.includes("30.0k"));
    ok(html.includes("Output"));
    ok(html.includes("15.0k"));
    ok(html.includes("Sessions"));
    ok(html.includes("3"));
  });

  it("shows reasoning tokens when non-zero", () => {
    const html = renderToString(
      <CostTokenSummary
        today={{
          costUsd: 0,
          tokensIn: 1000,
          tokensOut: 500,
          reasoningTokens: 200,
          cachedTokens: 0,
          sessionCount: 1,
        }}
      />,
    );
    ok(html.includes("Reasoning"));
  });

  it("hides reasoning tokens when zero", () => {
    const html = renderToString(
      <CostTokenSummary
        today={{
          costUsd: 0,
          tokensIn: 1000,
          tokensOut: 500,
          reasoningTokens: 0,
          cachedTokens: 0,
          sessionCount: 1,
        }}
      />,
    );
    ok(!html.includes("Reasoning"));
  });

  it("shows cached tokens when non-zero", () => {
    const html = renderToString(
      <CostTokenSummary
        today={{
          costUsd: 0,
          tokensIn: 1000,
          tokensOut: 500,
          reasoningTokens: 0,
          cachedTokens: 300,
          sessionCount: 1,
        }}
      />,
    );
    ok(html.includes("Cached"));
  });
});
