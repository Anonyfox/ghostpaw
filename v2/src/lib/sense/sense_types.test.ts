import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ConditionType,
  Modality,
  PreviousReading,
  SenseConfidence,
  SenseMetrics,
  SenseResult,
  SenseState,
  SenseStatus,
  SenseTextInfo,
  SenseVelocity,
} from "./sense_types.ts";

describe("sense_types", () => {
  it("SenseState accepts all valid state literals", () => {
    const states: SenseState[] = [
      "openness",
      "highway",
      "building",
      "mixed",
      "insufficient",
      "code_detected",
    ];
    strictEqual(states.length, 6);
  });

  it("Modality accepts all valid modality literals", () => {
    const modalities: Modality[] = ["prose", "code", "dialogue"];
    strictEqual(modalities.length, 3);
  });

  it("ConditionType accepts all valid condition literals", () => {
    const conditions: ConditionType[] = [
      "PREMATURE_CONVERGENCE",
      "GENUINE_COMPLETION",
      "BREAKTHROUGH",
      "HIGHWAY_DRIFT",
    ];
    strictEqual(conditions.length, 4);
  });

  it("SenseMetrics allows all optional fields", () => {
    const empty: SenseMetrics = {};
    ok(empty !== null);

    const full: SenseMetrics = {
      compression: 0.45,
      negation: 0.02,
      shortSentences: 0.15,
      semanticDistance: 0.65,
      momentum: 0.3,
      phaseTransitions: 2,
      selfReference: 0.01,
      sentenceLengthMean: 12.5,
      sentenceLengthSD: 4.2,
    };
    strictEqual(full.compression, 0.45);
  });

  it("SenseResult requires status, state, confidence, metrics, textInfo", () => {
    const result: SenseResult = {
      status: "ok",
      state: "mixed",
      confidence: "moderate",
      metrics: {},
      textInfo: { sentences: 5, words: 40, modality: "prose" },
    };
    strictEqual(result.status, "ok");
    strictEqual(result.state, "mixed");
  });

  it("SenseResult allows optional condition, intervention, velocity", () => {
    const result: SenseResult = {
      status: "attention",
      state: "highway",
      confidence: "high",
      condition: "HIGHWAY_DRIFT",
      intervention: "Some intervention text",
      metrics: { compression: 0.5 },
      textInfo: { sentences: 10, words: 100, modality: "prose" },
      velocity: {
        speed: 0.12,
        trajectory: "DRIFTING",
        dominant: "negation",
        direction: "rising",
        momentumLabel: "sustained",
      },
    };
    ok(result.condition !== undefined);
    ok(result.velocity !== undefined);
  });

  it("SenseStatus is 'ok' | 'attention'", () => {
    const statuses: SenseStatus[] = ["ok", "attention"];
    strictEqual(statuses.length, 2);
  });

  it("SenseConfidence is 'high' | 'moderate' | 'borderline'", () => {
    const tiers: SenseConfidence[] = ["high", "moderate", "borderline"];
    strictEqual(tiers.length, 3);
  });

  it("PreviousReading requires metrics and allows optional textInfo", () => {
    const minimal: PreviousReading = { metrics: {} };
    ok(minimal.textInfo === undefined);

    const full: PreviousReading = {
      metrics: { compression: 0.45 },
      textInfo: { sentences: 5, words: 40, modality: "prose" },
    };
    ok(full.textInfo !== undefined);
  });

  it("SenseVelocity direction is 'rising' | 'falling' | 'stable'", () => {
    const vel: SenseVelocity = {
      speed: 0.1,
      trajectory: "DRIFTING",
      dominant: "compression",
      direction: "stable",
    };
    ok(["rising", "falling", "stable"].includes(vel.direction));
  });

  it("SenseTextInfo requires sentences, words, modality", () => {
    const info: SenseTextInfo = { sentences: 3, words: 25, modality: "dialogue" };
    strictEqual(info.modality, "dialogue");
  });
});
