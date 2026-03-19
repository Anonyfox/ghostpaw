import type { DatabaseHandle } from "../../lib/index.ts";

export function fadeExhaustedShards(db: DatabaseHandle, maxCitations = 2): void {
  db.prepare(
    `UPDATE soul_shards SET status = 'faded'
     WHERE status = 'pending' AND id IN (
       SELECT shard_id FROM shard_citations
       GROUP BY shard_id
       HAVING COUNT(DISTINCT trait_id) >= ?
     )`,
  ).run(maxCitations);
}
