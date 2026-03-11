import type { DatabaseHandle } from "../../../lib/index.ts";

export function initPackTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_members (
      id            INTEGER PRIMARY KEY,
      name          TEXT    NOT NULL,
      nickname      TEXT,
      kind          TEXT    NOT NULL CHECK(kind IN ('human','group','ghostpaw','agent','service','other')),
      bond          TEXT    NOT NULL DEFAULT '',
      trust         REAL    NOT NULL DEFAULT 0.5,
      status        TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','dormant','lost')),
      is_user       INTEGER NOT NULL DEFAULT 0,
      parent_id     INTEGER REFERENCES pack_members(id),
      timezone      TEXT,
      locale        TEXT,
      location      TEXT,
      address       TEXT,
      pronouns      TEXT,
      birthday      TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_pack_members_status_last_contact
    ON pack_members(status, last_contact DESC)
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_members_is_user
    ON pack_members(is_user) WHERE is_user = 1 AND status != 'lost'
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_interactions (
      id            INTEGER PRIMARY KEY,
      member_id     INTEGER NOT NULL REFERENCES pack_members(id),
      kind          TEXT    NOT NULL CHECK(kind IN (
        'conversation','correction','conflict','gift',
        'milestone','observation','transaction','activity'
      )),
      summary       TEXT    NOT NULL,
      significance  REAL    NOT NULL DEFAULT 0.5,
      session_id    INTEGER,
      occurred_at   INTEGER,
      created_at    INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_interactions_member
    ON pack_interactions(member_id, created_at)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_interactions_occurred
    ON pack_interactions(kind) WHERE occurred_at IS NOT NULL
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_interactions_created
    ON pack_interactions(created_at)
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_fields (
      member_id  INTEGER NOT NULL REFERENCES pack_members(id),
      key        TEXT    NOT NULL,
      value      TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (member_id, key)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_fields_key
    ON pack_fields(key)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_fields_lookup
    ON pack_fields(key, value)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pack_links (
      id         INTEGER PRIMARY KEY,
      member_id  INTEGER NOT NULL REFERENCES pack_members(id),
      target_id  INTEGER NOT NULL REFERENCES pack_members(id),
      label      TEXT    NOT NULL,
      role       TEXT,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(member_id, target_id, label)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_links_target
    ON pack_links(target_id, active)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pack_links_label
    ON pack_links(label)
  `);
}
