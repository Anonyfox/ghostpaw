import { semanticDistanceCurve } from "./semantic_distance_curve.ts";

/**
 * Lag-1 autocorrelation of semantic distance curve.
 * Positive = sustained runs, negative = oscillation, zero = random.
 * Requires >= 4 sentences (producing >= 3 distance values).
 */
export function semanticMomentum(sentences: string[]): { momentum: number; n: number } {
  const curve = semanticDistanceCurve(sentences);
  if (curve.length < 3) return { momentum: 0, n: curve.length };

  const mean = curve.reduce((a, b) => a + b, 0) / curve.length;
  const centered = curve.map((v) => v - mean);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < centered.length - 1; i++) {
    numerator += centered[i] * centered[i + 1];
  }
  for (let i = 0; i < centered.length; i++) {
    denominator += centered[i] * centered[i];
  }

  return {
    momentum: denominator > 0 ? numerator / denominator : 0,
    n: curve.length,
  };
}
