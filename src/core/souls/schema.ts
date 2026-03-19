import type { DatabaseHandle } from "../../lib/index.ts";

export function initSoulsTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS souls (
      id           INTEGER PRIMARY KEY,
      slug         TEXT    DEFAULT NULL,
      name         TEXT    NOT NULL,
      essence      TEXT    NOT NULL DEFAULT '',
      description  TEXT    NOT NULL DEFAULT '',
      level        INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL,
      deleted_at      INTEGER,
      last_attuned_at INTEGER
    )
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_name_active
    ON souls(name) WHERE deleted_at IS NULL
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_slug
    ON souls(slug) WHERE slug IS NOT NULL
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS soul_traits (
      id          INTEGER PRIMARY KEY,
      soul_id     INTEGER NOT NULL REFERENCES souls(id),
      principle   TEXT    NOT NULL,
      provenance  TEXT    NOT NULL,
      generation  INTEGER NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'active'
                          CHECK(status IN ('active','consolidated','promoted','reverted')),
      merged_into INTEGER REFERENCES soul_traits(id),
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_soul_traits_active
    ON soul_traits(soul_id) WHERE status = 'active'
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_soul_traits_history
    ON soul_traits(soul_id, generation)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS soul_levels (
      id                   INTEGER PRIMARY KEY,
      soul_id              INTEGER NOT NULL REFERENCES souls(id),
      level                INTEGER NOT NULL,
      essence_before       TEXT    NOT NULL,
      essence_after        TEXT    NOT NULL,
      traits_consolidated  TEXT    NOT NULL DEFAULT '[]',
      traits_promoted      TEXT    NOT NULL DEFAULT '[]',
      traits_carried       TEXT    NOT NULL DEFAULT '[]',
      traits_merged        TEXT    NOT NULL DEFAULT '[]',
      created_at           INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_soul_levels_soul
    ON soul_levels(soul_id, level)
  `);
}
