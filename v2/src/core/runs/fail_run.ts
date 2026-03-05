import type { DatabaseHandle } from "../../lib/index.ts";

export function failRun(db: DatabaseHandle, id: number, error: string): void {
  db.prepare(
    "UPDATE delegation_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?",
  ).run(error, Date.now(), id);
}
