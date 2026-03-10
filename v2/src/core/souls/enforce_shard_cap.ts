import type { DatabaseHandle } from "../../lib/index.ts";
import { pendingShardCount } from "./pending_shard_count.ts";

export function enforceShardCap(db: DatabaseHandle, cap = 75): void {
  const count = pendingShardCount(db);
  if (count <= cap) return;

  db.prepare(
    `UPDATE soul_shards SET status = 'faded'
     WHERE id IN (
       SELECT id FROM soul_shards
       WHERE status = 'pending' AND sealed = 0
       ORDER BY created_at ASC
       LIMIT ?
     )`,
  ).run(count - cap);
}
