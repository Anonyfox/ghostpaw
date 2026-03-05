import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { computeVelocity } from "./compute_velocity.ts";
import { velocityDirection } from "./velocity_direction.ts";

describe("velocityDirection", () => {
  it("identifies dominant dimension", () => {
    const vel = computeVelocity(
      { compression: 0.55, negation: 0.01 },
      { compression: 0.35, negation: 0.01 },
    );
    const dir = velocityDirection(vel);
    strictEqual(dir.dominant, "compression");
    strictEqual(dir.sign, 1);
  });

  it("returns 0 sign when no change", () => {
    const vel = computeVelocity({}, {});
    const dir = velocityDirection(vel);
    strictEqual(dir.sign, 0);
  });

  it("detects falling direction", () => {
    const vel = computeVelocity({ negation: 0 }, { negation: 0.06 });
    const dir = velocityDirection(vel);
    ok(dir.sign <= 0);
  });
});
