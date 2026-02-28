import type { DatabaseHandle } from "../../lib/index.ts";

export function initChatTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id              INTEGER PRIMARY KEY,
      key             TEXT    NOT NULL,
      purpose         TEXT    NOT NULL DEFAULT 'chat',
      model           TEXT,
      created_at      INTEGER NOT NULL,
      last_active_at  INTEGER NOT NULL,
      tokens_in       INTEGER NOT NULL DEFAULT 0,
      tokens_out      INTEGER NOT NULL DEFAULT 0,
      cost_usd        REAL    NOT NULL DEFAULT 0,
      head_message_id INTEGER,
      closed_at       INTEGER,
      absorbed_at     INTEGER
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(key)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_purpose ON sessions(purpose)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at)");

  const cols = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  const hasDisplayName = cols.some((c) => c.name === "display_name");
  if (!hasDisplayName) {
    db.exec("ALTER TABLE sessions ADD COLUMN display_name TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id              INTEGER PRIMARY KEY,
      session_id      INTEGER NOT NULL REFERENCES sessions(id),
      parent_id       INTEGER REFERENCES messages(id),
      role            TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
      content         TEXT    NOT NULL,
      model           TEXT,
      tokens_in       INTEGER NOT NULL DEFAULT 0,
      tokens_out      INTEGER NOT NULL DEFAULT 0,
      cost_usd        REAL    NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      is_compaction   INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id)");
}
