import type { DatabaseHandle } from "../../lib/index.ts";
import type { ShardSource } from "./shard_types.ts";

export function dropSoulshard(
  db: DatabaseHandle,
  source: ShardSource,
  sourceId: string | null,
  observation: string,
  soulIds: number[],
  sealed = false,
): number {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO soul_shards (source, source_id, observation, sealed) VALUES (?, ?, ?, ?)")
    .run(source, sourceId, observation, sealed ? 1 : 0);

  const id = Number(lastInsertRowid);
  const stmt = db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)");
  for (const soulId of soulIds) {
    stmt.run(id, soulId);
  }
  return id;
}
