import type { DatabaseHandle } from "../../lib/index.ts";

export function initSoulShardTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soul_shards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      source_id   TEXT,
      observation TEXT    NOT NULL,
      sealed      INTEGER NOT NULL DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'pending',
      created_at  INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_soul_shards_status
    ON soul_shards(status, sealed)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shard_souls (
      shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
      soul_id  INTEGER NOT NULL,
      PRIMARY KEY (shard_id, soul_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shard_citations (
      shard_id  INTEGER NOT NULL REFERENCES soul_shards(id),
      trait_id  INTEGER NOT NULL REFERENCES soul_traits(id),
      cited_at  INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (shard_id, trait_id)
    )
  `);
}
