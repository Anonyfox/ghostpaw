import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { computeVelocity, VELOCITY_KEYS } from "./compute_velocity.ts";

describe("computeVelocity", () => {
  it("computes raw differences", () => {
    const vel = computeVelocity(
      {
        compression: 0.5,
        negation: 0.03,
        shortSentences: 0.2,
        phaseTransitions: 3,
        semanticDistance: 0.6,
      },
      {
        compression: 0.45,
        negation: 0.02,
        shortSentences: 0.15,
        phaseTransitions: 2,
        semanticDistance: 0.5,
      },
    );
    ok(Math.abs(vel.raw.compression - 0.05) < 1e-10);
    ok(Math.abs(vel.raw.negation - 0.01) < 1e-10);
  });

  it("populates all velocity keys", () => {
    const vel = computeVelocity({}, {});
    for (const key of VELOCITY_KEYS) {
      strictEqual(typeof vel.raw[key], "number");
      strictEqual(typeof vel.normalized[key], "number");
    }
  });

  it("normalized values are bounded when inputs are within range", () => {
    const vel = computeVelocity(
      {
        compression: 0.45,
        negation: 0.03,
        shortSentences: 0.25,
        phaseTransitions: 5,
        semanticDistance: 0.6,
      },
      {
        compression: 0.45,
        negation: 0.03,
        shortSentences: 0.25,
        phaseTransitions: 5,
        semanticDistance: 0.6,
      },
    );
    for (const key of VELOCITY_KEYS) {
      ok(Math.abs(vel.normalized[key]) < 1e-10, `${key} should be 0 for identical inputs`);
    }
  });
});
