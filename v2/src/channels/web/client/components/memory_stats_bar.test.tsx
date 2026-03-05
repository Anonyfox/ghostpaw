import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { MemoryStatsResponse } from "../../shared/memory_types.ts";
import { MemoryStatsBar } from "./memory_stats_bar.tsx";

describe("MemoryStatsBar", () => {
  it("shows loading state when stats is null", () => {
    const html = render(<MemoryStatsBar stats={null} />);
    ok(html.includes("Loading stats"));
  });

  it("renders active count", () => {
    const stats: MemoryStatsResponse = {
      active: 42,
      total: 50,
      strong: 20,
      fading: 15,
      faint: 7,
      stale: 3,
      byCategory: {},
    };
    const html = render(<MemoryStatsBar stats={stats} />);
    ok(html.includes("42"));
    ok(html.includes("active"));
  });

  it("renders stale count when > 0", () => {
    const stats: MemoryStatsResponse = {
      active: 10,
      total: 10,
      strong: 5,
      fading: 3,
      faint: 2,
      stale: 2,
      byCategory: {},
    };
    const html = render(<MemoryStatsBar stats={stats} />);
    ok(html.includes("2 needs review"));
  });

  it("does not render stale button when stale is 0", () => {
    const stats: MemoryStatsResponse = {
      active: 10,
      total: 10,
      strong: 5,
      fading: 3,
      faint: 2,
      stale: 0,
      byCategory: {},
    };
    const html = render(<MemoryStatsBar stats={stats} />);
    ok(!html.includes("needs review"));
  });
});
