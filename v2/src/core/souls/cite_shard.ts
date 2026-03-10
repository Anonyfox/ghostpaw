import type { DatabaseHandle } from "../../lib/index.ts";

export function citeShard(db: DatabaseHandle, shardId: number, traitId: number): void {
  db.prepare("INSERT OR IGNORE INTO shard_citations (shard_id, trait_id) VALUES (?, ?)").run(
    shardId,
    traitId,
  );
}
