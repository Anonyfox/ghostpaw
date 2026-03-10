import type { DatabaseHandle } from "../../lib/index.ts";

export function pendingShardCount(db: DatabaseHandle): number {
  const row = db
    .prepare("SELECT COUNT(*) AS cnt FROM soul_shards WHERE status = 'pending' AND sealed = 0")
    .get() as { cnt: number };
  return row.cnt;
}
