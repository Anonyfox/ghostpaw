import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyState } from "./classify_state.ts";

describe("classifyState", () => {
  it("returns code_detected for code modality", () => {
    strictEqual(classifyState({}, 10, "code"), "code_detected");
  });

  it("returns openness when negation > 0.02 and shortSentences > 0.12", () => {
    strictEqual(classifyState({ negation: 0.03, shortSentences: 0.15 }, 5, "prose"), "openness");
  });

  it("requires >= 3 sentences for openness", () => {
    strictEqual(classifyState({ negation: 0.03, shortSentences: 0.15 }, 2, "prose"), "mixed");
  });

  it("returns highway when low structural variety and >= 5 sentences", () => {
    strictEqual(
      classifyState({ negation: 0.01, shortSentences: 0.05, phaseTransitions: 0 }, 5, "prose"),
      "highway",
    );
  });

  it("requires >= 5 sentences for highway", () => {
    strictEqual(
      classifyState({ negation: 0.01, shortSentences: 0.05, phaseTransitions: 0 }, 4, "prose"),
      "mixed",
    );
  });

  it("returns building when momentum > 0.25", () => {
    strictEqual(
      classifyState({ negation: 0.01, shortSentences: 0.1, momentum: 0.35 }, 5, "prose"),
      "building",
    );
  });

  it("openness takes priority over building when both qualify", () => {
    strictEqual(
      classifyState({ negation: 0.03, shortSentences: 0.15, momentum: 0.35 }, 5, "prose"),
      "openness",
    );
  });

  it("returns mixed as fallback", () => {
    strictEqual(classifyState({ negation: 0.015, shortSentences: 0.1 }, 5, "prose"), "mixed");
  });

  it("works for dialogue modality (not code)", () => {
    strictEqual(classifyState({ negation: 0.03, shortSentences: 0.15 }, 5, "dialogue"), "openness");
  });
});
