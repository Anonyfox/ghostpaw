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
      is_user       INTEGER NOT NULL DEFAULT 0,
      first_contact INTEGER NOT NULL,
      last_contact  INTEGER NOT NULL,
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_members_is_user
    ON pack_members(is_user) WHERE is_user = 1 AND status != 'lost'
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_contacts (
      id         INTEGER PRIMARY KEY,
      member_id  INTEGER NOT NULL REFERENCES pack_members(id),
      type       TEXT    NOT NULL CHECK(type IN (
        'email','phone','website',
        'github','gitlab',
        'twitter','bluesky','mastodon','linkedin',
        'telegram','discord','slack','signal',
        'other'
      )),
      value      TEXT NOT NULL,
      label      TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(type, value)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_contacts_member
    ON pack_contacts(member_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_contacts_lookup
    ON pack_contacts(type, value)
  `);
}
