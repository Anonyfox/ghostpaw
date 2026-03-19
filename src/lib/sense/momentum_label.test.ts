import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { momentumLabel } from "./momentum_label.ts";

describe("momentumLabel", () => {
  it("returns undefined for undefined input", () => {
    strictEqual(momentumLabel(undefined), undefined);
  });

  it("returns sustained for momentum > 0.3", () => {
    strictEqual(momentumLabel(0.35), "sustained");
  });

  it("returns oscillating for momentum < -0.15", () => {
    strictEqual(momentumLabel(-0.2), "oscillating");
  });

  it("returns low for small absolute momentum", () => {
    strictEqual(momentumLabel(0.05), "low");
    strictEqual(momentumLabel(-0.05), "low");
  });

  it("returns moderate for middle range", () => {
    strictEqual(momentumLabel(0.2), "moderate");
    strictEqual(momentumLabel(-0.12), "moderate");
  });
});
