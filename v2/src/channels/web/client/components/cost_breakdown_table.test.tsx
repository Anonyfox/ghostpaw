import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "preact-render-to-string";
import { CostBreakdownTable } from "./cost_breakdown_table.tsx";

describe("CostBreakdownTable", () => {
  it("renders table with rows", () => {
    const html = renderToString(
      <CostBreakdownTable
        title="By Model"
        columns={[
          { key: "model", label: "Model" },
          { key: "costUsd", label: "Cost", align: "end" },
        ]}
        rows={[{ model: "claude-sonnet-4-6", costUsd: 0.38 }]}
      />,
    );
    ok(html.includes("By Model"));
    ok(html.includes("claude-sonnet-4-6"));
    ok(html.includes("0.38"));
  });

  it("returns null when rows empty", () => {
    const html = renderToString(
      <CostBreakdownTable
        title="By Model"
        columns={[{ key: "model", label: "Model" }]}
        rows={[]}
      />,
    );
    strictEqual(html, "");
  });

  it("applies custom format function", () => {
    const html = renderToString(
      <CostBreakdownTable
        title="Test"
        columns={[{ key: "name", label: "Name", format: (v) => `[${v}]` }]}
        rows={[{ name: "foo" }]}
      />,
    );
    ok(html.includes("[foo]"));
  });

  it("applies end alignment class", () => {
    const html = renderToString(
      <CostBreakdownTable
        title="Test"
        columns={[{ key: "val", label: "Value", align: "end" }]}
        rows={[{ val: 42 }]}
      />,
    );
    ok(html.includes("text-end"));
  });
});
