import type { DatabaseHandle } from "../../lib/index.ts";

export function expireOldShards(db: DatabaseHandle, maxAgeDays = 120): void {
  db.prepare(
    `UPDATE soul_shards SET status = 'faded'
     WHERE status = 'pending' AND created_at < unixepoch() - ? * 86400`,
  ).run(maxAgeDays);
}
