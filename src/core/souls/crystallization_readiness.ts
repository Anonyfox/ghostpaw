import type { DatabaseHandle } from "../../lib/index.ts";
import type { CrystallizationEntry } from "./shard_types.ts";

export function crystallizationReadiness(
  db: DatabaseHandle,
  minShards = 3,
): CrystallizationEntry[] {
  // All pending shards count toward the threshold/diversity/spread check.
  // The new-evidence gate only fires Phase 2 if at least one shard arrived
  // since the soul was last attuned — prevents repeated LLM calls on stale data.
  const rows = db
    .prepare(
      `SELECT ss.soul_id,
              COUNT(DISTINCT s.id) AS shard_count,
              COUNT(DISTINCT s.source) AS source_diversity,
              MAX(s.created_at) - MIN(s.created_at) AS age_spread
       FROM shard_souls ss
       JOIN soul_shards s ON s.id = ss.shard_id
       JOIN souls sl ON sl.id = ss.soul_id
       WHERE s.status = 'pending' AND s.sealed = 0
       GROUP BY ss.soul_id
       HAVING shard_count >= ? AND source_diversity >= 2 AND age_spread > 86400
         AND (sl.last_attuned_at IS NULL OR MAX(s.created_at) > sl.last_attuned_at)
       ORDER BY shard_count DESC`,
    )
    .all(minShards) as {
    soul_id: number;
    shard_count: number;
    source_diversity: number;
    age_spread: number;
  }[];
  return rows.map((r) => ({
    soulId: r.soul_id,
    shardCount: r.shard_count,
    sourceDiversity: r.source_diversity,
    ageSpread: r.age_spread,
  }));
}
