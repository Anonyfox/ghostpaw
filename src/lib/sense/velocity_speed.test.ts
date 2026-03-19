import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { computeVelocity } from "./compute_velocity.ts";
import { velocitySpeed } from "./velocity_speed.ts";

describe("velocitySpeed", () => {
  it("returns 0 for identical metrics", () => {
    const vel = computeVelocity(
      { compression: 0.45, negation: 0.03 },
      { compression: 0.45, negation: 0.03 },
    );
    strictEqual(velocitySpeed(vel), 0);
  });

  it("returns positive for differing metrics", () => {
    const vel = computeVelocity(
      { compression: 0.55, negation: 0.06 },
      { compression: 0.35, negation: 0 },
    );
    ok(velocitySpeed(vel) > 0);
  });
});
