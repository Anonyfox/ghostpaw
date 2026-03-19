import {
  buildBreakthroughIntervention,
  buildConvergenceIntervention,
  buildGenuineIntervention,
  buildHighwayIntervention,
} from "./build_intervention.ts";
import type { ConditionType, PreviousReading, SenseMetrics, SenseState } from "./sense_types.ts";

export function detectCondition(
  metrics: SenseMetrics,
  state: SenseState,
  previous: PreviousReading,
): { type: ConditionType; intervention: string } | null {
  const mom = metrics.momentum;
  const prevMom = previous.metrics.momentum;
  const comp = metrics.compression ?? 0;
  const prevComp = previous.metrics.compression ?? 0;
  const dComp = comp - prevComp;
  const pt = metrics.phaseTransitions ?? 0;
  const sd = metrics.semanticDistance ?? 0;

  if (state === "highway") {
    return {
      type: "HIGHWAY_DRIFT",
      intervention: buildHighwayIntervention(metrics),
    };
  }

  if (mom === undefined || prevMom === undefined) return null;
  const dMom = mom - prevMom;

  if (dMom > 0.25 && dComp < -0.02) {
    return {
      type: "BREAKTHROUGH",
      intervention: buildBreakthroughIntervention(metrics, dMom),
    };
  }

  const momCrashed = dMom < -0.15 || Math.abs(mom) < 0.1;
  if (!momCrashed) return null;

  if (dComp < -0.02) {
    return {
      type: "GENUINE_COMPLETION",
      intervention: buildGenuineIntervention(metrics),
    };
  }

  if (Math.abs(dComp) < 0.015 && (pt >= 2 || sd > 0.6)) {
    return {
      type: "PREMATURE_CONVERGENCE",
      intervention: buildConvergenceIntervention(metrics),
    };
  }

  return null;
}
