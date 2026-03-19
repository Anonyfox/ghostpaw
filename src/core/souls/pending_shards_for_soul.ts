import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToShard } from "./row_to_shard.ts";
import type { SoulShard } from "./shard_types.ts";

export function pendingShardsForSoul(db: DatabaseHandle, soulId: number): SoulShard[] {
  const rows = db
    .prepare(
      `SELECT s.*, GROUP_CONCAT(all_ss.soul_id) AS soul_ids
       FROM soul_shards s
       JOIN shard_souls filter_ss ON filter_ss.shard_id = s.id AND filter_ss.soul_id = ?
       LEFT JOIN shard_souls all_ss ON all_ss.shard_id = s.id
       WHERE s.status = 'pending' AND s.sealed = 0
       GROUP BY s.id
       ORDER BY s.created_at`,
    )
    .all(soulId) as Record<string, unknown>[];
  return rows.map(rowToShard);
}
