import type { DatabaseHandle } from "../../lib/index.ts";
import type { DriftAlert, TrustTier } from "./types.ts";

const DAY_MS = 86_400_000;
const CADENCE_SAMPLE_SIZE = 4;
const CADENCE_MULTIPLIER = 2.5;
const MAX_ALERTS = 10;

const TIER_THRESHOLDS: { minTrust: number; tier: TrustTier; silenceDays: number }[] = [
  { minTrust: 0.8, tier: "deep", silenceDays: 14 },
  { minTrust: 0.6, tier: "solid", silenceDays: 30 },
  { minTrust: 0.3, tier: "growing", silenceDays: 60 },
];

type MemberRow = {
  id: number;
  name: string;
  trust: number;
  last_contact: number;
};

function trustTier(trust: number): TrustTier {
  return trust >= 0.8 ? "deep" : trust >= 0.6 ? "solid" : "growing";
}

function fallbackThresholdDays(trust: number): number {
  return TIER_THRESHOLDS.find((threshold) => trust >= threshold.minTrust)?.silenceDays ?? 60;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function cadenceThreshold(
  timestamps: number[],
): { baselineDays: number; thresholdDays: number } | null {
  if (timestamps.length < CADENCE_SAMPLE_SIZE) {
    return null;
  }

  const sorted = [...timestamps].sort((a, b) => a - b);
  const intervals = [];
  for (let index = 1; index < sorted.length; index += 1) {
    intervals.push(Math.max(1, (sorted[index] - sorted[index - 1]) / DAY_MS));
  }
  if (intervals.length < CADENCE_SAMPLE_SIZE - 1) {
    return null;
  }

  const baselineDays = median(intervals);
  const burstiness = (Math.max(...intervals) - Math.min(...intervals)) / Math.max(1, baselineDays);
  const multiplier = CADENCE_MULTIPLIER + Math.min(1, burstiness);
  return {
    baselineDays,
    thresholdDays: Math.max(2, Math.ceil(baselineDays * multiplier)),
  };
}

export function detectDrift(db: DatabaseHandle, now: number = Date.now()): DriftAlert[] {
  const rows = db
    .prepare(
      `SELECT id, name, trust, last_contact
       FROM pack_members
       WHERE status = 'active' AND trust >= 0.3`,
    )
    .all() as MemberRow[];

  if (rows.length === 0) {
    return [];
  }

  const timestampsByMember = new Map<number, number[]>();
  const interactionRows = db
    .prepare(
      `SELECT member_id, COALESCE(occurred_at, created_at) AS at
       FROM pack_interactions
       WHERE member_id IN (
         SELECT id FROM pack_members WHERE status = 'active' AND trust >= 0.3
       )
       ORDER BY member_id, at DESC`,
    )
    .all() as { member_id: number; at: number }[];
  for (const row of interactionRows) {
    const existing = timestampsByMember.get(row.member_id) ?? [];
    existing.push(row.at);
    timestampsByMember.set(row.member_id, existing);
  }

  return rows
    .map((row) => {
      const tier = trustTier(row.trust);
      const daysSilent = Math.floor((now - row.last_contact) / DAY_MS);
      const fallbackDays = fallbackThresholdDays(row.trust);
      const cadence = cadenceThreshold(timestampsByMember.get(row.id) ?? []);

      const thresholdDays = cadence?.thresholdDays ?? fallbackDays;
      if (daysSilent <= thresholdDays) {
        return null;
      }

      return {
        memberId: row.id,
        name: row.name,
        trust: row.trust,
        tier,
        daysSilent,
        thresholdDays,
        source: cadence ? "cadence" : "fallback",
        ...(cadence ? { baselineDays: Math.round(cadence.baselineDays * 10) / 10 } : {}),
      } satisfies DriftAlert;
    })
    .filter((alert): alert is DriftAlert => alert !== null)
    .sort((left, right) => {
      const leftSeverity = left.daysSilent / left.thresholdDays;
      const rightSeverity = right.daysSilent / right.thresholdDays;
      return (
        rightSeverity - leftSeverity ||
        right.trust - left.trust ||
        right.daysSilent - left.daysSilent
      );
    })
    .slice(0, MAX_ALERTS);
}
