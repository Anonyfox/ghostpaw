import type { DatabaseHandle } from "../../lib/index.ts";
import { detectDrift } from "./detect_drift.ts";
import { detectPatrol } from "./detect_patrol.ts";
import type { PackDigest } from "./types.ts";
import { upcomingLandmarks } from "./upcoming_landmarks.ts";

const THIRTY_DAYS_MS = 30 * 86_400_000;

export function packDigest(
  db: DatabaseHandle,
  daysAhead: number = 14,
  now: number = Date.now(),
): PackDigest {
  const drift = detectDrift(db, now);
  const landmarks = upcomingLandmarks(db, daysAhead, now);
  const patrol = detectPatrol(db, drift, landmarks, now);

  const counts = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'dormant' THEN 1 ELSE 0 END) AS dormant,
        AVG(CASE WHEN status = 'active' THEN trust END) AS avg_trust
       FROM pack_members`,
    )
    .get() as { active: number; dormant: number; avg_trust: number | null };

  const recentRow = db
    .prepare("SELECT COUNT(*) AS c FROM pack_interactions WHERE created_at > ?")
    .get(now - THIRTY_DAYS_MS) as { c: number };

  return {
    drift,
    landmarks,
    patrol,
    stats: {
      activeMembers: counts.active ?? 0,
      dormantMembers: counts.dormant ?? 0,
      recentInteractions: recentRow.c,
      averageTrust: counts.avg_trust !== null ? Math.round(counts.avg_trust * 100) / 100 : 0,
    },
    generatedAt: now,
  };
}
