import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { semanticDistanceCurve } from "./semantic_distance_curve.ts";

describe("semanticDistanceCurve", () => {
  it("returns empty for fewer than 2 sentences", () => {
    deepStrictEqual(semanticDistanceCurve([]), []);
    deepStrictEqual(semanticDistanceCurve(["Only one."]), []);
  });

  it("returns N-1 distances for N sentences", () => {
    const sents = ["First sentence here.", "Second sentence here.", "Third sentence here."];
    strictEqual(semanticDistanceCurve(sents).length, 2);
  });

  it("returns 0 distance for identical sentences", () => {
    const curve = semanticDistanceCurve(["The cat sat on the mat.", "The cat sat on the mat."]);
    ok(Math.abs(curve[0]) < 1e-10);
  });

  it("returns positive distance for different sentences", () => {
    const curve = semanticDistanceCurve([
      "Quantum mechanics describes subatomic particles.",
      "Chocolate cake is delicious with vanilla ice cream.",
    ]);
    ok(curve[0] > 0);
  });
});
