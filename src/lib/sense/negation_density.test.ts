import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { negationDensity } from "./negation_density.ts";

describe("negationDensity", () => {
  it("detects negation words", () => {
    const rate = negationDensity(["this", "is", "not", "a", "test"]);
    ok(Math.abs(rate - 1 / 5) < 1e-10);
  });

  it("detects contractions", () => {
    ok(negationDensity(["it", "can't", "be", "done"]) > 0);
  });

  it("returns 0 for affirmative text", () => {
    strictEqual(negationDensity(["the", "sun", "is", "shining"]), 0);
  });
});
