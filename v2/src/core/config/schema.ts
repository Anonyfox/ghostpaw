import type { DatabaseHandle } from "../../lib/database.ts";

export function initConfigTable(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id         INTEGER PRIMARY KEY,
      key        TEXT    NOT NULL,
      value      TEXT    NOT NULL,
      type       TEXT    NOT NULL DEFAULT 'string',
      category   TEXT    NOT NULL DEFAULT 'custom',
      source     TEXT    NOT NULL DEFAULT 'cli',
      next_id    INTEGER REFERENCES config(id),
      updated_at INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_config_key_next ON config(key, next_id)
  `);
}
