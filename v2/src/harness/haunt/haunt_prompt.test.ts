import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { HauntAnalysis } from "./types.ts";
import { TEXT_ONLY_CONTINUATION, WRAP_UP, buildHauntPrompt } from "./haunt_prompt.ts";

function makeAnalysis(overrides?: Partial<HauntAnalysis>): HauntAnalysis {
  return {
    hauntCount: 5,
    recentTopicCluster: null,
    coveredTopics: [],
    seed: "What's the first thing that comes to mind?",
    seedMemories: [],
    recentHaunts: [],
    novelty: { newMemories: [], revisedMemories: [], timeSinceLastHaunt: null },
    ...overrides,
  };
}

describe("buildHauntPrompt", () => {
  it("returns the seed for normal haunts", () => {
    const seed = "Pick something in your workspace you've never read.";
    const prompt = buildHauntPrompt(makeAnalysis({ seed }));
    strictEqual(prompt, seed);
  });

  it("returns first-haunt seed when hauntCount is 0", () => {
    const prompt = buildHauntPrompt(makeAnalysis({ hauntCount: 0 }));
    ok(prompt.includes("new"));
    ok(prompt.includes("catches"));
  });

  it("is non-empty for any analysis", () => {
    ok(buildHauntPrompt(makeAnalysis()).length > 0);
  });
});

describe("TEXT_ONLY_CONTINUATION", () => {
  it("labels itself as automated", () => {
    ok(TEXT_ONLY_CONTINUATION.includes("Automated"));
    ok(TEXT_ONLY_CONTINUATION.includes("no audience"));
  });

  it("points toward tool use", () => {
    ok(TEXT_ONLY_CONTINUATION.includes("tool"));
  });

  it("is non-empty", () => {
    ok(TEXT_ONLY_CONTINUATION.length > 0);
  });
});

describe("WRAP_UP", () => {
  it("contains wrap up instruction", () => {
    ok(WRAP_UP.includes("Wrap up"));
  });

  it("is non-empty", () => {
    ok(WRAP_UP.length > 0);
  });
});
