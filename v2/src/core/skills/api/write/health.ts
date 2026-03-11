import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { SkillHealthData } from "../read/health.ts";

export function writeSkillHealth(db: DatabaseHandle, data: SkillHealthData): void {
  db.prepare(
    `INSERT INTO skill_health
     (total_skills, rank_distribution, stale_skills, dormant_skills, oversized_skills,
      pending_fragments, expired_fragments, repairs_applied, proposals_queued, explored)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.totalSkills,
    JSON.stringify(data.rankDistribution),
    JSON.stringify(data.staleSkills),
    JSON.stringify(data.dormantSkills),
    JSON.stringify(data.oversizedSkills),
    data.pendingFragments,
    data.expiredFragments,
    data.repairsApplied,
    data.proposalsQueued,
    data.explored ? 1 : 0,
  );
}
