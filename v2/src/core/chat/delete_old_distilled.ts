import type { DatabaseHandle } from "../../lib/index.ts";

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function deleteOldDistilled(db: DatabaseHandle, ttlMs = DEFAULT_TTL_MS): number {
  const cutoff = Date.now() - ttlMs;
  const rows = db
    .prepare("SELECT id FROM sessions WHERE distilled_at IS NOT NULL AND distilled_at < ?")
    .all(cutoff) as { id: number }[];

  if (rows.length === 0) return 0;

  db.exec("BEGIN");
  try {
    for (const { id } of rows) {
      db.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
      db.prepare(
        "DELETE FROM delegation_runs WHERE parent_session_id = ? OR child_session_id = ?",
      ).run(id, id);
      db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return rows.length;
}
