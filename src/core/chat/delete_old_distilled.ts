import type { DatabaseHandle } from "../../lib/index.ts";

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function deleteOldDistilled(db: DatabaseHandle, ttlMs = DEFAULT_TTL_MS): number {
  const cutoff = Date.now() - ttlMs;

  db.exec("BEGIN");
  try {
    db.prepare(
      "DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE distilled_at IS NOT NULL AND distilled_at < ?)",
    ).run(cutoff);
    const result = db
      .prepare("DELETE FROM sessions WHERE distilled_at IS NOT NULL AND distilled_at < ?")
      .run(cutoff);
    db.exec("COMMIT");
    return result.changes;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
