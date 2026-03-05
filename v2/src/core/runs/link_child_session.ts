import type { DatabaseHandle } from "../../lib/index.ts";

export function linkChildSession(db: DatabaseHandle, runId: number, childSessionId: number): void {
  db.prepare("UPDATE delegation_runs SET child_session_id = ? WHERE id = ?").run(
    childSessionId,
    runId,
  );
}
