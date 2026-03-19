import type { DatabaseHandle } from "../../../lib/index.ts";

export function initSkillHealthTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_health (
      computed_at       INTEGER DEFAULT (unixepoch()),
      total_skills      INTEGER,
      rank_distribution TEXT,
      stale_skills      TEXT,
      dormant_skills    TEXT,
      oversized_skills  TEXT,
      pending_fragments INTEGER,
      expired_fragments INTEGER,
      repairs_applied   INTEGER,
      proposals_queued  INTEGER,
      explored          INTEGER
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_proposals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      rationale    TEXT    NOT NULL,
      fragment_ids TEXT    NOT NULL DEFAULT '[]',
      status       TEXT    NOT NULL DEFAULT 'pending',
      created_at   INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_proposals_status
    ON skill_proposals(status)
  `);
}
