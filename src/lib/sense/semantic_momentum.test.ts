import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { semanticMomentum } from "./semantic_momentum.ts";

describe("semanticMomentum", () => {
  it("returns 0 for fewer than 4 sentences", () => {
    strictEqual(semanticMomentum(["One.", "Two."]).momentum, 0);
    strictEqual(semanticMomentum(["One.", "Two.", "Three."]).momentum, 0);
  });

  it("returns a number between -1 and 1 for sufficient input", () => {
    const sents = [
      "Artificial intelligence transforms industries worldwide.",
      "Machine learning models require large training datasets.",
      "Neural networks contain layers of weighted connections.",
      "Gradient descent optimizes the loss function iteratively.",
      "Backpropagation computes gradients through the network layers.",
    ];
    const { momentum } = semanticMomentum(sents);
    ok(momentum >= -1 && momentum <= 1, `momentum=${momentum}`);
  });
});
