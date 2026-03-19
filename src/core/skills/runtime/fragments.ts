import type { DatabaseHandle } from "../../../lib/index.ts";

export function initSkillFragmentsTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_fragments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      source_id   TEXT,
      observation TEXT    NOT NULL,
      domain      TEXT,
      status      TEXT    NOT NULL DEFAULT 'pending',
      consumed_by TEXT,
      created_at  INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_fragments_status
    ON skill_fragments(status, domain)
  `);
}
