import type { Modality, SenseMetrics, SenseState } from "./sense_types.ts";

export function classifyState(
  metrics: SenseMetrics,
  sentenceCount: number,
  modality: Modality,
): SenseState {
  if (modality === "code") return "code_detected";

  const neg = metrics.negation ?? 0;
  const ss = metrics.shortSentences ?? 0;
  const pt = metrics.phaseTransitions ?? 0;
  const mom = metrics.momentum;

  // Exp 22, 26: openness is perfectly separable at d > 3 on negation + shortSentences
  if (sentenceCount >= 3 && neg > 0.02 && ss > 0.12) return "openness";

  // Exp 22, 26: highway = absence of structural variety. Needs PT which requires >= 5 sents
  if (sentenceCount >= 5 && pt <= 1 && neg < 0.012 && ss < 0.08) return "highway";

  // Exp 12: building = sustained forward momentum without openness/highway markers
  if (mom !== undefined && mom > 0.25) return "building";

  return "mixed";
}
