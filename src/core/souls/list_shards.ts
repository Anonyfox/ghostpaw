import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToShard } from "./row_to_shard.ts";
import { SHARD_SELECT_WITH_SOULS } from "./shard_select_sql.ts";
import type { ShardStatus, SoulShard } from "./shard_types.ts";

export function listShards(
  db: DatabaseHandle,
  opts?: { status?: ShardStatus; soulId?: number; limit?: number },
): SoulShard[] {
  const limit = opts?.limit ?? 100;

  if (opts?.soulId && opts?.status) {
    return db
      .prepare(
        `SELECT s.*, GROUP_CONCAT(all_ss.soul_id) AS soul_ids
         FROM soul_shards s
         JOIN shard_souls filter_ss ON filter_ss.shard_id = s.id AND filter_ss.soul_id = ?
         LEFT JOIN shard_souls all_ss ON all_ss.shard_id = s.id
         WHERE s.status = ?
         GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`,
      )
      .all(opts.soulId, opts.status, limit)
      .map((r) => rowToShard(r as Record<string, unknown>));
  }

  if (opts?.soulId) {
    return db
      .prepare(
        `SELECT s.*, GROUP_CONCAT(all_ss.soul_id) AS soul_ids
         FROM soul_shards s
         JOIN shard_souls filter_ss ON filter_ss.shard_id = s.id AND filter_ss.soul_id = ?
         LEFT JOIN shard_souls all_ss ON all_ss.shard_id = s.id
         WHERE s.status != 'faded'
         GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`,
      )
      .all(opts.soulId, limit)
      .map((r) => rowToShard(r as Record<string, unknown>));
  }

  if (opts?.status) {
    return db
      .prepare(
        `${SHARD_SELECT_WITH_SOULS}
         WHERE s.status = ?
         GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`,
      )
      .all(opts.status, limit)
      .map((r) => rowToShard(r as Record<string, unknown>));
  }

  return db
    .prepare(
      `${SHARD_SELECT_WITH_SOULS}
       WHERE s.status != 'faded'
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`,
    )
    .all(limit)
    .map((r) => rowToShard(r as Record<string, unknown>));
}
