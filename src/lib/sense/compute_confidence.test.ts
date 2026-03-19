import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { computeConfidence } from "./compute_confidence.ts";

describe("computeConfidence", () => {
  it("returns moderate for insufficient state", () => {
    strictEqual(computeConfidence("insufficient", {}, 0), "moderate");
  });

  it("returns moderate for code_detected state", () => {
    strictEqual(computeConfidence("code_detected", {}, 10), "moderate");
  });

  it("returns moderate for mixed state", () => {
    strictEqual(computeConfidence("mixed", {}, 10), "moderate");
  });

  it("returns borderline when sentence count < 5 for classified states", () => {
    strictEqual(
      computeConfidence("openness", { negation: 0.05, shortSentences: 0.3 }, 4),
      "borderline",
    );
  });

  it("openness: high when metrics far above threshold", () => {
    strictEqual(
      computeConfidence("openness", { negation: 0.04, shortSentences: 0.25 }, 10),
      "high",
    );
  });

  it("openness: borderline when near threshold", () => {
    strictEqual(
      computeConfidence("openness", { negation: 0.022, shortSentences: 0.13 }, 10),
      "borderline",
    );
  });

  it("openness: moderate in middle range", () => {
    strictEqual(
      computeConfidence("openness", { negation: 0.028, shortSentences: 0.18 }, 10),
      "moderate",
    );
  });

  it("highway: high when all metrics very low", () => {
    strictEqual(
      computeConfidence(
        "highway",
        { negation: 0.005, shortSentences: 0.03, phaseTransitions: 0 },
        10,
      ),
      "high",
    );
  });

  it("highway: borderline when close to classification boundary", () => {
    strictEqual(
      computeConfidence(
        "highway",
        { negation: 0.009, shortSentences: 0.03, phaseTransitions: 0 },
        10,
      ),
      "borderline",
    );
  });

  it("building: high when momentum far above 0.25", () => {
    strictEqual(computeConfidence("building", { momentum: 0.5 }, 10), "high");
  });

  it("building: borderline near threshold", () => {
    strictEqual(computeConfidence("building", { momentum: 0.28 }, 10), "borderline");
  });

  it("building: moderate in middle range", () => {
    strictEqual(computeConfidence("building", { momentum: 0.38 }, 10), "moderate");
  });
});
