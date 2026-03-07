import type { DatabaseHandle } from "../../lib/index.ts";

export function migrateHauntsToSessions(db: DatabaseHandle): void {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='haunts'")
    .get() as { name: string } | undefined;
  if (!exists) return;

  db.exec("BEGIN");
  try {
    db.exec(`
      UPDATE sessions SET display_name = (
        SELECT summary FROM haunts WHERE haunts.session_id = sessions.id
      )
      WHERE id IN (SELECT session_id FROM haunts)
        AND display_name IS NULL
    `);
    db.exec("DROP TABLE haunts");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
