const VELOCITY_KEYS = [
  "compression",
  "negation",
  "shortSentences",
  "phaseTransitions",
  "semanticDistance",
] as const;

type VelocityKey = (typeof VELOCITY_KEYS)[number];

const NORMALIZATION_RANGES: Record<VelocityKey, { min: number; max: number }> = {
  compression: { min: 0.35, max: 0.55 },
  negation: { min: 0, max: 0.06 },
  shortSentences: { min: 0, max: 0.5 },
  phaseTransitions: { min: 0, max: 10 },
  semanticDistance: { min: 0.4, max: 0.85 },
};

function normalizeMetric(key: VelocityKey, value: number): number {
  const r = NORMALIZATION_RANGES[key];
  return Math.max(0, Math.min(1, (value - r.min) / (r.max - r.min)));
}

export { VELOCITY_KEYS };
export type { VelocityKey };

export interface VelocityVector {
  raw: Record<VelocityKey, number>;
  normalized: Record<VelocityKey, number>;
}

export function computeVelocity(
  current: Record<string, number>,
  previous: Record<string, number>,
): VelocityVector {
  const raw = {} as Record<VelocityKey, number>;
  const normalized = {} as Record<VelocityKey, number>;
  for (const key of VELOCITY_KEYS) {
    raw[key] = (current[key] ?? 0) - (previous[key] ?? 0);
    normalized[key] =
      normalizeMetric(key, current[key] ?? 0) - normalizeMetric(key, previous[key] ?? 0);
  }
  return { raw, normalized };
}
