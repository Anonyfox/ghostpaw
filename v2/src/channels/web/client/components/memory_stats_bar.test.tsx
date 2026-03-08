import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { MemoryStatsResponse } from "../../shared/memory_types.ts";
import { MemoryStatsBar } from "./memory_stats_bar.tsx";

function makeStats(overrides: Partial<MemoryStatsResponse> = {}): MemoryStatsResponse {
  return {
    active: 10,
    total: 12,
    strong: 5,
    fading: 3,
    faint: 2,
    stale: 0,
    byCategory: {},
    bySource: { explicit: 6, observed: 4 },
    avgEvidence: 1.5,
    singleEvidence: 3,
    recentRevisions: 0,
    ...overrides,
  };
}

describe("MemoryStatsBar", () => {
  it("shows loading state when stats is null", () => {
    const html = render(<MemoryStatsBar stats={null} />);
    ok(html.includes("Loading stats"));
  });

  it("renders active count", () => {
    const html = render(<MemoryStatsBar stats={makeStats({ active: 42, total: 50 })} />);
    ok(html.includes("42"));
    ok(html.includes("active"));
  });

  it("renders stale count when > 0", () => {
    const html = render(<MemoryStatsBar stats={makeStats({ stale: 2 })} />);
    ok(html.includes("2 needs review"));
  });

  it("does not render stale button when stale is 0", () => {
    const html = render(<MemoryStatsBar stats={makeStats()} />);
    ok(!html.includes("needs review"));
  });

  it("renders source breakdown", () => {
    const html = render(<MemoryStatsBar stats={makeStats()} />);
    ok(html.includes("explicit"));
    ok(html.includes("observed"));
  });

  it("renders unconfirmed count when singleEvidence > 0", () => {
    const html = render(<MemoryStatsBar stats={makeStats({ singleEvidence: 5 })} />);
    ok(html.includes("5 unconfirmed"));
  });

  it("renders revised recently when recentRevisions > 0", () => {
    const html = render(<MemoryStatsBar stats={makeStats({ recentRevisions: 3 })} />);
    ok(html.includes("3 revised recently"));
  });
});
