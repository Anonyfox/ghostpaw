import type { ShardSource, ShardStatus, SoulShard } from "./shard_types.ts";

export function rowToShard(row: Record<string, unknown>): SoulShard {
  const soulIdsRaw = row.soul_ids as string | null;
  return {
    id: row.id as number,
    source: row.source as ShardSource,
    sourceId: row.source_id as string | null,
    observation: row.observation as string,
    sealed: (row.sealed as number) === 1,
    status: row.status as ShardStatus,
    createdAt: row.created_at as number,
    soulIds: soulIdsRaw ? soulIdsRaw.split(",").map(Number) : [],
  };
}
