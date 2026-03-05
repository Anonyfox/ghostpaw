import type { DatabaseHandle } from "../../lib/index.ts";

export function completeRun(db: DatabaseHandle, id: number, result: string): void {
  db.prepare(
    "UPDATE delegation_runs SET status = 'completed', result = ?, completed_at = ? WHERE id = ?",
  ).run(result, Date.now(), id);
}
