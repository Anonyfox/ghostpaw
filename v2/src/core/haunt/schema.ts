import type { DatabaseHandle } from "../../lib/index.ts";

export function initHauntTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS haunts (
      id                 INTEGER PRIMARY KEY,
      session_id         INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
      raw_journal        TEXT    NOT NULL,
      summary            TEXT    NOT NULL,
      seeded_memory_ids  TEXT    NOT NULL DEFAULT '[]',
      created_at         INTEGER NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_haunts_created_at ON haunts(created_at DESC)");

  addColumnIfMissing(db, "haunts", "seeded_memory_ids", "TEXT NOT NULL DEFAULT '[]'");
}

function addColumnIfMissing(
  db: DatabaseHandle,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
