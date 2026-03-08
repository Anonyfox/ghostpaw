import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { trustLabel } from "./trust_label.ts";

describe("trustLabel", () => {
  it("returns correct tier at boundaries", () => {
    strictEqual(trustLabel(1.0), "deep");
    strictEqual(trustLabel(0.8), "deep");
    strictEqual(trustLabel(0.79), "solid");
    strictEqual(trustLabel(0.6), "solid");
    strictEqual(trustLabel(0.59), "growing");
    strictEqual(trustLabel(0.3), "growing");
    strictEqual(trustLabel(0.29), "shallow");
    strictEqual(trustLabel(0.0), "shallow");
  });
});
