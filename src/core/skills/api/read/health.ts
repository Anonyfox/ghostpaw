import type { DatabaseHandle } from "../../../../lib/index.ts";

export interface SkillHealthData {
  computedAt: number;
  totalSkills: number;
  rankDistribution: Record<string, number>;
  staleSkills: string[];
  dormantSkills: string[];
  oversizedSkills: string[];
  pendingFragments: number;
  expiredFragments: number;
  repairsApplied: number;
  proposalsQueued: number;
  explored: boolean;
}

export function readSkillHealth(db: DatabaseHandle): SkillHealthData | null {
  const row = db.prepare("SELECT * FROM skill_health ORDER BY rowid DESC LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    computedAt: row.computed_at as number,
    totalSkills: row.total_skills as number,
    rankDistribution: JSON.parse((row.rank_distribution as string) || "{}"),
    staleSkills: JSON.parse((row.stale_skills as string) || "[]"),
    dormantSkills: JSON.parse((row.dormant_skills as string) || "[]"),
    oversizedSkills: JSON.parse((row.oversized_skills as string) || "[]"),
    pendingFragments: row.pending_fragments as number,
    expiredFragments: row.expired_fragments as number,
    repairsApplied: row.repairs_applied as number,
    proposalsQueued: row.proposals_queued as number,
    explored: (row.explored as number) === 1,
  };
}
