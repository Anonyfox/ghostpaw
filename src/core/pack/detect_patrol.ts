import type { DatabaseHandle } from "../../lib/index.ts";
import type { DriftAlert, Landmark, PackPatrolItem } from "./types.ts";

const DAY_MS = 86_400_000;
const MAX_PATROL_ITEMS = 3;

interface PatrolCandidate extends PackPatrolItem {
  priority: number;
}

function latestConflictRepairs(db: DatabaseHandle, now: number): PatrolCandidate[] {
  const rows = db
    .prepare(
      `SELECT m.id AS member_id, m.name, m.trust, i.kind, COALESCE(i.occurred_at, i.created_at) AS at
       FROM pack_members m
       JOIN pack_interactions i ON i.member_id = m.id
       WHERE m.status = 'active' AND m.trust >= 0.6
       ORDER BY m.id, at DESC`,
    )
    .all() as { member_id: number; name: string; trust: number; kind: string; at: number }[];

  const candidates: PatrolCandidate[] = [];
  const seenMembers = new Set<number>();
  for (const row of rows) {
    if (seenMembers.has(row.member_id)) continue;
    seenMembers.add(row.member_id);
    if (row.kind !== "conflict") continue;

    const daysSinceConflict = Math.floor((now - row.at) / DAY_MS);
    if (daysSinceConflict > 21) continue;

    candidates.push({
      kind: "repair",
      memberId: row.member_id,
      name: row.name,
      summary: `Conflict ${daysSinceConflict}d ago with no follow-up yet.`,
      priority: 140 - daysSinceConflict + row.trust * 10,
    });
  }
  return candidates;
}

function reconnectCandidates(drift: DriftAlert[]): PatrolCandidate[] {
  return drift
    .filter((alert) => alert.tier !== "growing" || alert.daysSilent >= alert.thresholdDays + 14)
    .map((alert) => ({
      kind: "reconnect" as const,
      memberId: alert.memberId,
      name: alert.name,
      summary:
        alert.source === "cadence" && alert.baselineDays !== undefined
          ? `${alert.daysSilent}d silent; usual rhythm is about every ${alert.baselineDays}d.`
          : `${alert.daysSilent}d silent; beyond the ${alert.thresholdDays}d fallback threshold.`,
      priority: 100 + (alert.daysSilent / alert.thresholdDays) * 20 + alert.trust * 10,
    }));
}

function landmarkCandidates(
  db: DatabaseHandle,
  landmarks: Landmark[],
  drift: DriftAlert[],
  now: number,
): PatrolCandidate[] {
  const driftIds = new Set(drift.map((alert) => alert.memberId));
  const candidates: PatrolCandidate[] = [];

  for (const landmark of landmarks) {
    const member = db
      .prepare("SELECT trust, last_contact FROM pack_members WHERE id = ? AND status = 'active'")
      .get(landmark.memberId) as { trust: number; last_contact: number } | undefined;
    if (!member || member.trust < 0.6) {
      continue;
    }

    const daysSilent = Math.floor((now - member.last_contact) / DAY_MS);
    if (daysSilent < 7 && !driftIds.has(landmark.memberId)) {
      continue;
    }

    const label =
      landmark.type === "birthday"
        ? `Birthday in ${landmark.daysAway}d`
        : `Anniversary in ${landmark.daysAway}d`;
    candidates.push({
      kind: "landmark",
      memberId: landmark.memberId,
      name: landmark.name,
      summary: `${label} for a ${daysSilent}d-quiet important bond.`,
      priority:
        80 +
        (14 - Math.min(14, landmark.daysAway)) +
        member.trust * 10 +
        (driftIds.has(landmark.memberId) ? 10 : 0),
    });
  }

  return candidates;
}

export function detectPatrol(
  db: DatabaseHandle,
  drift: DriftAlert[],
  landmarks: Landmark[],
  now: number = Date.now(),
): PackPatrolItem[] {
  const candidates = [
    ...latestConflictRepairs(db, now),
    ...reconnectCandidates(drift),
    ...landmarkCandidates(db, landmarks, drift, now),
  ];

  const bestByMember = new Map<number, PatrolCandidate>();
  for (const candidate of candidates) {
    const existing = bestByMember.get(candidate.memberId);
    if (!existing || candidate.priority > existing.priority) {
      bestByMember.set(candidate.memberId, candidate);
    }
  }

  return [...bestByMember.values()]
    .sort((left, right) => right.priority - left.priority)
    .slice(0, MAX_PATROL_ITEMS)
    .map(({ priority: _priority, ...item }) => item);
}
