import type { DatabaseHandle } from "../../lib/index.ts";
import type { ShardSource } from "./shard_types.ts";

export function revealShards(db: DatabaseHandle, source: ShardSource, sourceId: string): void {
  db.prepare(
    "UPDATE soul_shards SET sealed = 0 WHERE source = ? AND source_id = ? AND sealed = 1",
  ).run(source, sourceId);
}
