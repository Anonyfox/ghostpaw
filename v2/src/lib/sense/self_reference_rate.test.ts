import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { selfReferenceRate } from "./self_reference_rate.ts";

describe("selfReferenceRate", () => {
  it("detects first-person pronouns", () => {
    const rate = selfReferenceRate(["i", "think", "therefore", "i", "am"]);
    ok(Math.abs(rate - 2 / 5) < 1e-10);
  });

  it("returns 0 for third-person text", () => {
    strictEqual(selfReferenceRate(["the", "system", "processes", "data"]), 0);
  });

  it("returns 0 for empty input", () => {
    strictEqual(selfReferenceRate([]), 0);
  });
});
