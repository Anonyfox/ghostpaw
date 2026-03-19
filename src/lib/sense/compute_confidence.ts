import type { SenseConfidence, SenseMetrics, SenseState } from "./sense_types.ts";

export function computeConfidence(
  state: SenseState,
  metrics: SenseMetrics,
  sentenceCount: number,
): SenseConfidence {
  if (state === "insufficient" || state === "code_detected" || state === "mixed") {
    return "moderate";
  }

  if (sentenceCount < 5) return "borderline";

  switch (state) {
    case "openness": {
      const negMargin = (metrics.negation ?? 0) / 0.02;
      const ssMargin = (metrics.shortSentences ?? 0) / 0.12;
      const minMargin = Math.min(negMargin, ssMargin);
      if (minMargin < 1.15) return "borderline";
      if (minMargin < 1.75) return "moderate";
      return "high";
    }
    case "highway": {
      const neg = metrics.negation ?? 0;
      const ss = metrics.shortSentences ?? 0;
      const pt = metrics.phaseTransitions ?? 0;
      if (neg > 0.008 || ss > 0.05 || pt > 0) return "borderline";
      return "high";
    }
    case "building": {
      const momMargin = (metrics.momentum ?? 0) / 0.25;
      if (momMargin < 1.2) return "borderline";
      if (momMargin < 1.75) return "moderate";
      return "high";
    }
    default:
      return "moderate";
  }
}
