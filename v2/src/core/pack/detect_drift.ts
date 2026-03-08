import type { DatabaseHandle } from "../../lib/index.ts";
import type { DriftAlert, TrustTier } from "./types.ts";

const DAY_MS = 86_400_000;

const TIER_THRESHOLDS: { minTrust: number; tier: TrustTier; silenceDays: number }[] = [
  { minTrust: 0.8, tier: "deep", silenceDays: 14 },
  { minTrust: 0.6, tier: "solid", silenceDays: 30 },
  { minTrust: 0.3, tier: "growing", silenceDays: 60 },
];

export function detectDrift(db: DatabaseHandle, now: number = Date.now()): DriftAlert[] {
  const deepCutoff = now - TIER_THRESHOLDS[0].silenceDays * DAY_MS;
  const solidCutoff = now - TIER_THRESHOLDS[1].silenceDays * DAY_MS;
  const growingCutoff = now - TIER_THRESHOLDS[2].silenceDays * DAY_MS;

  const rows = db
    .prepare(
      `SELECT id, name, trust, last_contact FROM pack_members
       WHERE status = 'active' AND trust >= 0.3
         AND (
           (trust >= 0.8 AND last_contact < ?)
           OR (trust >= 0.6 AND trust < 0.8 AND last_contact < ?)
           OR (trust >= 0.3 AND trust < 0.6 AND last_contact < ?)
         )
       ORDER BY trust DESC, last_contact ASC`,
    )
    .all(deepCutoff, solidCutoff, growingCutoff) as {
    id: number;
    name: string;
    trust: number;
    last_contact: number;
  }[];

  return rows.map((r) => {
    const tier: TrustTier = r.trust >= 0.8 ? "deep" : r.trust >= 0.6 ? "solid" : "growing";
    return {
      memberId: r.id,
      name: r.name,
      trust: r.trust,
      tier,
      daysSilent: Math.floor((now - r.last_contact) / DAY_MS),
    };
  });
}
