import type { DatabaseHandle } from "../../lib/index.ts";
import type { ShardCountPerSoul } from "./shard_types.ts";

export function shardCountsPerSoul(db: DatabaseHandle): ShardCountPerSoul[] {
  const rows = db
    .prepare(
      `SELECT ss.soul_id,
              COUNT(DISTINCT s.id) AS cnt,
              COUNT(DISTINCT s.source) AS src_cnt
       FROM shard_souls ss
       JOIN soul_shards s ON s.id = ss.shard_id
       WHERE s.status = 'pending' AND s.sealed = 0
       GROUP BY ss.soul_id`,
    )
    .all() as { soul_id: number; cnt: number; src_cnt: number }[];
  return rows.map((r) => ({
    soulId: r.soul_id,
    count: r.cnt,
    sourceCount: r.src_cnt,
  }));
}
