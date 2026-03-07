import type { DatabaseHandle } from "../../lib/index.ts";

export function initHowlTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS howls (
      id                 INTEGER PRIMARY KEY,
      origin_session_id  INTEGER NOT NULL REFERENCES sessions(id),
      origin_message_id  INTEGER REFERENCES messages(id),
      message            TEXT    NOT NULL,
      urgency            TEXT    NOT NULL DEFAULT 'low',
      channel            TEXT,
      status             TEXT    NOT NULL DEFAULT 'pending',
      created_at         INTEGER NOT NULL,
      responded_at       INTEGER
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_howls_status ON howls(status)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_howls_created_at ON howls(created_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_howls_origin_session ON howls(origin_session_id)");
}
