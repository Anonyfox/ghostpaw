import type { DatabaseHandle } from "../../lib/database_handle.ts";

export function claimProcessorRun(
  db: DatabaseHandle,
  impressionId: number,
  processor: string,
): number | null {
  const done = db
    .prepare(
      `SELECT 1 FROM shade_runs WHERE impression_id = ? AND processor = ? AND status = 'done'`,
    )
    .get(impressionId, processor);
  if (done) return null;

  db.prepare(
    `DELETE FROM shade_runs WHERE impression_id = ? AND processor = ? AND status != 'done'`,
  ).run(impressionId, processor);

  const result = db
    .prepare(
      `INSERT INTO shade_runs (impression_id, processor, status, started_at)
       VALUES (?, ?, 'running', strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    )
    .run(impressionId, processor);
  return Number(result.lastInsertRowid);
}
