import type { DatabaseHandle } from "../../lib/index.ts";

export function initMemoryTable(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id             INTEGER PRIMARY KEY,
      claim          TEXT    NOT NULL,
      embedding      BLOB,
      confidence     REAL    NOT NULL DEFAULT 0.7,
      evidence_count INTEGER NOT NULL DEFAULT 1,
      created_at     INTEGER NOT NULL,
      verified_at    INTEGER NOT NULL,
      source         TEXT    NOT NULL DEFAULT 'absorbed',
      category       TEXT    NOT NULL DEFAULT 'custom',
      superseded_by  INTEGER REFERENCES memories(id)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_active
    ON memories(confidence, verified_at)
    WHERE superseded_by IS NULL
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_stale
    ON memories(evidence_count, verified_at)
    WHERE superseded_by IS NULL
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_category
    ON memories(category)
    WHERE superseded_by IS NULL
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_confidence
    ON memories(confidence)
    WHERE superseded_by IS NULL
  `);
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      claim,
      content=memories,
      content_rowid=id
    )
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memories_fts_insert
    AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, claim) VALUES (new.id, new.claim);
    END
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memories_fts_delete
    AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, claim)
      VALUES ('delete', old.id, old.claim);
    END
  `);
}
