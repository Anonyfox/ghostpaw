import type { DatabaseHandle } from "../../lib/database_handle.ts";

export const SETTINGS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  id         INTEGER PRIMARY KEY,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'string',
  secret     INTEGER NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT 'user',
  next_id    INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_settings_chain ON settings(key, next_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_head ON settings(key) WHERE next_id IS NULL;
`;

export function initSettingsTable(db: DatabaseHandle): void {
  db.exec(SETTINGS_SCHEMA_SQL);
}
