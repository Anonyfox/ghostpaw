const DEFAULT_HALF_LIFE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export function freshness(
  verifiedAt: number,
  evidenceCount: number,
  now: number,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): number {
  if (evidenceCount <= 0) return 0;
  if (halfLifeDays <= 0) return 0;
  const ageDays = (now - verifiedAt) / MS_PER_DAY;
  if (ageDays <= 0) return 1;
  return Math.exp(-ageDays / (halfLifeDays * Math.sqrt(evidenceCount)));
}
