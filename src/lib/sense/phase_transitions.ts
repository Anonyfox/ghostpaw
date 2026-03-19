import { semanticDistanceCurve } from "./semantic_distance_curve.ts";

/**
 * Semantic distance spikes exceeding mean + sigma * stdDev.
 * sigma=1.0 matches the calibration used across all 33 experiments.
 */
export function phaseTransitions(
  sentences: string[],
  sigma = 1.0,
): { count: number; threshold: number; positions: number[] } {
  const curve = semanticDistanceCurve(sentences);
  if (curve.length === 0) return { count: 0, threshold: 0, positions: [] };

  const mean = curve.reduce((a, b) => a + b, 0) / curve.length;
  const std = Math.sqrt(curve.reduce((a, d) => a + (d - mean) ** 2, 0) / curve.length);
  const threshold = mean + sigma * std;

  const positions: number[] = [];
  for (let i = 0; i < curve.length; i++) {
    if (curve[i] > threshold) positions.push(i + 1);
  }

  return { count: positions.length, threshold, positions };
}
