import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { bondExcerpt, trustLevel } from "./pack_types.ts";

describe("pack shared types", () => {
  it("trustLevel returns correct levels at boundaries", () => {
    strictEqual(trustLevel(1.0), "deep");
    strictEqual(trustLevel(0.8), "deep");
    strictEqual(trustLevel(0.79), "solid");
    strictEqual(trustLevel(0.6), "solid");
    strictEqual(trustLevel(0.59), "growing");
    strictEqual(trustLevel(0.3), "growing");
    strictEqual(trustLevel(0.29), "shallow");
    strictEqual(trustLevel(0.0), "shallow");
  });

  it("bondExcerpt returns short bonds unchanged", () => {
    strictEqual(bondExcerpt("Short bond."), "Short bond.");
    strictEqual(bondExcerpt(""), "");
  });

  it("bondExcerpt truncates at the limit with ellipsis", () => {
    const long = "A".repeat(200);
    const result = bondExcerpt(long);
    strictEqual(result.length, 123);
    ok(result.endsWith("..."));
  });

  it("bondExcerpt respects custom maxLen", () => {
    const result = bondExcerpt("Hello World", 5);
    strictEqual(result, "Hello...");
  });
});
