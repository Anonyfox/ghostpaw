import type { DatabaseHandle } from "../../lib/index.ts";

export function initPackTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_members (
      id            INTEGER PRIMARY KEY,
      name          TEXT    NOT NULL,
      kind          TEXT    NOT NULL CHECK(kind IN ('human','ghostpaw','agent','service','other')),
      bond          TEXT    NOT NULL DEFAULT '',
      trust         REAL    NOT NULL DEFAULT 0.5,
      status        TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','dormant','lost')),
      first_contact INTEGER NOT NULL,
      last_contact  INTEGER NOT NULL,
      metadata      TEXT    NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_members_name
    ON pack_members(name) WHERE status != 'lost'
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_members_status
    ON pack_members(status)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_interactions (
      id            INTEGER PRIMARY KEY,
      member_id     INTEGER NOT NULL REFERENCES pack_members(id),
      kind          TEXT    NOT NULL CHECK(kind IN ('conversation','correction','conflict','gift','milestone','observation')),
      summary       TEXT    NOT NULL,
      significance  REAL    NOT NULL DEFAULT 0.5,
      session_id    INTEGER,
      created_at    INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_interactions_member
    ON pack_interactions(member_id, created_at)
  `);
}
