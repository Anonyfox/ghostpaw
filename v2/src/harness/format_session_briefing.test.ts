import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { SessionBriefing } from "../core/trail/api/read/index.ts";
import { formatSessionBriefing } from "./format_session_briefing.ts";

const now = Date.now();

function makeChapter(label: string, momentum: string) {
  return {
    id: 1,
    label,
    description: null,
    startedAt: now,
    endedAt: null,
    momentum: momentum as "rising" | "stable" | "declining" | "shifting",
    confidence: 0.8,
    createdAt: now,
    updatedAt: now,
  };
}

function makeLoop(desc: string, significance: number) {
  return {
    id: 1,
    description: desc,
    category: "organic" as const,
    sourceType: null,
    sourceId: null,
    significance,
    status: "alive" as const,
    recommendedAction: null,
    earliestResurface: null,
    createdAt: now,
    updatedAt: now,
  };
}

function makeOmen(forecast: string, confidence: number) {
  return {
    id: 1,
    forecast,
    confidence,
    horizon: null,
    resolvedAt: null,
    outcome: null,
    predictionError: null,
    createdAt: now,
  };
}

describe("formatSessionBriefing", () => {
  it("returns null when briefing is entirely empty", () => {
    const briefing: SessionBriefing = { chapter: null, openLoops: [], unresolvedOmens: [] };
    strictEqual(formatSessionBriefing(briefing), null);
  });

  it("includes chapter line when chapter exists", () => {
    const briefing: SessionBriefing = {
      chapter: makeChapter("Deep work sprint", "rising"),
      openLoops: [],
      unresolvedOmens: [],
    };
    const result = formatSessionBriefing(briefing)!;
    ok(result.includes("## Current Context"));
    ok(result.includes("Current chapter: Deep work sprint (rising)"));
  });

  it("includes top 3 open loops by significance", () => {
    const briefing: SessionBriefing = {
      chapter: null,
      openLoops: [
        makeLoop("Loop A", 9),
        makeLoop("Loop B", 7),
        makeLoop("Loop C", 5),
        makeLoop("Loop D", 3),
      ],
      unresolvedOmens: [],
    };
    const result = formatSessionBriefing(briefing)!;
    ok(result.includes("- Loop A (significance 9)"));
    ok(result.includes("- Loop B (significance 7)"));
    ok(result.includes("- Loop C (significance 5)"));
    ok(!result.includes("Loop D"));
  });

  it("includes top 2 omens", () => {
    const briefing: SessionBriefing = {
      chapter: null,
      openLoops: [],
      unresolvedOmens: [
        makeOmen("Burnout risk", 0.7),
        makeOmen("Project deadline slip", 0.6),
        makeOmen("Third omen", 0.3),
      ],
    };
    const result = formatSessionBriefing(briefing)!;
    ok(result.includes("- Omen: Burnout risk (confidence 0.7)"));
    ok(result.includes("- Omen: Project deadline slip (confidence 0.6)"));
    ok(!result.includes("Third omen"));
  });

  it("combines chapter, loops, and omens in one block", () => {
    const briefing: SessionBriefing = {
      chapter: makeChapter("Exploration phase", "stable"),
      openLoops: [makeLoop("Unresolved thread", 8)],
      unresolvedOmens: [makeOmen("Scope creep likely", 0.65)],
    };
    const result = formatSessionBriefing(briefing)!;
    ok(result.startsWith("## Current Context\n\n"));
    ok(result.includes("Current chapter: Exploration phase (stable)"));
    ok(result.includes("- Unresolved thread (significance 8)"));
    ok(result.includes("- Omen: Scope creep likely (confidence 0.65)"));
  });
});
