import type { DatabaseHandle } from "../../../lib/index.ts";

export function initSkillEventsTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      skill      TEXT    NOT NULL,
      event      TEXT    NOT NULL,
      session_id TEXT,
      ts         INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_events_skill
    ON skill_events(skill, event, id)
  `);
}
