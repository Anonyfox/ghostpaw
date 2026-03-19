import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { detectCondition } from "./detect_condition.ts";

describe("detectCondition", () => {
  it("returns HIGHWAY_DRIFT for highway state", () => {
    const result = detectCondition(
      { negation: 0.005, shortSentences: 0.03, phaseTransitions: 0 },
      "highway",
      { metrics: {} },
    );
    strictEqual(result?.type, "HIGHWAY_DRIFT");
    ok(result!.intervention.length > 0);
  });

  it("returns null when no previous momentum", () => {
    const result = detectCondition({ momentum: 0.3 }, "mixed", { metrics: {} });
    strictEqual(result, null);
  });

  it("returns BREAKTHROUGH on momentum surge + compression deepening", () => {
    const result = detectCondition({ momentum: 0.5, compression: 0.4 }, "building", {
      metrics: { momentum: 0.2, compression: 0.45 },
    });
    strictEqual(result?.type, "BREAKTHROUGH");
  });

  it("returns GENUINE_COMPLETION on momentum crash + compression deepened", () => {
    const result = detectCondition({ momentum: 0.05, compression: 0.38 }, "mixed", {
      metrics: { momentum: 0.3, compression: 0.42 },
    });
    strictEqual(result?.type, "GENUINE_COMPLETION");
  });

  it("returns PREMATURE_CONVERGENCE on momentum crash + flat compression + terrain not exhausted", () => {
    const result = detectCondition(
      { momentum: 0.05, compression: 0.45, phaseTransitions: 3, semanticDistance: 0.65 },
      "mixed",
      { metrics: { momentum: 0.3, compression: 0.45 } },
    );
    strictEqual(result?.type, "PREMATURE_CONVERGENCE");
  });

  it("returns null when momentum drops but conditions don't match any specific type", () => {
    const result = detectCondition(
      { momentum: 0.05, compression: 0.45, phaseTransitions: 0, semanticDistance: 0.3 },
      "mixed",
      { metrics: { momentum: 0.3, compression: 0.45 } },
    );
    strictEqual(result, null);
  });

  it("returns null for non-highway state without momentum in either reading", () => {
    strictEqual(
      detectCondition({ compression: 0.45 }, "openness", { metrics: { compression: 0.44 } }),
      null,
    );
  });
});
