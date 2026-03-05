import type { DatabaseHandle } from "../../lib/index.ts";

export function initChatTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                INTEGER PRIMARY KEY,
      key               TEXT    NOT NULL,
      purpose           TEXT    NOT NULL DEFAULT 'chat',
      model             TEXT,
      created_at        INTEGER NOT NULL,
      last_active_at    INTEGER NOT NULL,
      tokens_in         INTEGER NOT NULL DEFAULT 0,
      tokens_out        INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens  INTEGER NOT NULL DEFAULT 0,
      cached_tokens     INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL    NOT NULL DEFAULT 0,
      head_message_id   INTEGER,
      closed_at         INTEGER,
      distilled_at      INTEGER,
      parent_session_id INTEGER REFERENCES sessions(id)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(key)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_purpose ON sessions(purpose)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at)");

  const sessionCols = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  const addSessionCol = (name: string, def: string) => {
    if (!sessionCols.some((c) => c.name === name))
      db.exec(`ALTER TABLE sessions ADD COLUMN ${def}`);
  };
  addSessionCol("display_name", "display_name TEXT");
  addSessionCol("parent_session_id", "parent_session_id INTEGER REFERENCES sessions(id)");
  addSessionCol("reasoning_tokens", "reasoning_tokens INTEGER NOT NULL DEFAULT 0");
  addSessionCol("cached_tokens", "cached_tokens INTEGER NOT NULL DEFAULT 0");

  if (sessionCols.some((c) => c.name === "absorbed_at")) {
    db.exec("ALTER TABLE sessions RENAME COLUMN absorbed_at TO distilled_at");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id               INTEGER PRIMARY KEY,
      session_id       INTEGER NOT NULL REFERENCES sessions(id),
      parent_id        INTEGER REFERENCES messages(id),
      role             TEXT    NOT NULL CHECK(role IN ('user', 'assistant', 'tool_call', 'tool_result')),
      content          TEXT    NOT NULL,
      model            TEXT,
      tokens_in        INTEGER NOT NULL DEFAULT 0,
      tokens_out       INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      cached_tokens    INTEGER NOT NULL DEFAULT 0,
      cost_usd         REAL    NOT NULL DEFAULT 0,
      created_at       INTEGER NOT NULL,
      is_compaction    INTEGER NOT NULL DEFAULT 0,
      tool_data        TEXT
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id)");

  const msgCols = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
  const addMsgCol = (name: string, def: string) => {
    if (!msgCols.some((c) => c.name === name)) db.exec(`ALTER TABLE messages ADD COLUMN ${def}`);
  };
  addMsgCol("reasoning_tokens", "reasoning_tokens INTEGER NOT NULL DEFAULT 0");
  addMsgCol("cached_tokens", "cached_tokens INTEGER NOT NULL DEFAULT 0");
  addMsgCol("tool_data", "tool_data TEXT");
  addMsgCol("distilled", "distilled INTEGER NOT NULL DEFAULT 0");

  migrateMessagesCheckConstraint(db);
}

// SQLite table rebuild: FK enforcement must be off during DROP/RENAME
// so the self-referential parent_id FK doesn't block the old table drop.
function migrateMessagesCheckConstraint(db: DatabaseHandle): void {
  const tableInfo = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'")
    .get() as { sql: string } | undefined;
  if (!tableInfo) return;
  if (tableInfo.sql.includes("tool_call")) return;

  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(`
      CREATE TABLE messages_new (
        id               INTEGER PRIMARY KEY,
        session_id       INTEGER NOT NULL REFERENCES sessions(id),
        parent_id        INTEGER REFERENCES messages(id),
        role             TEXT    NOT NULL CHECK(role IN ('user', 'assistant', 'tool_call', 'tool_result')),
        content          TEXT    NOT NULL,
        model            TEXT,
        tokens_in        INTEGER NOT NULL DEFAULT 0,
        tokens_out       INTEGER NOT NULL DEFAULT 0,
        reasoning_tokens INTEGER NOT NULL DEFAULT 0,
        cached_tokens    INTEGER NOT NULL DEFAULT 0,
        cost_usd         REAL    NOT NULL DEFAULT 0,
        created_at       INTEGER NOT NULL,
        is_compaction    INTEGER NOT NULL DEFAULT 0,
        tool_data        TEXT
      )
    `);
    db.exec(`
      INSERT INTO messages_new
        (id, session_id, parent_id, role, content, model, tokens_in, tokens_out,
         reasoning_tokens, cached_tokens, cost_usd, created_at, is_compaction, tool_data)
      SELECT id, session_id, parent_id, role, content, model, tokens_in, tokens_out,
             reasoning_tokens, cached_tokens, cost_usd, created_at, is_compaction, NULL
      FROM messages
    `);
    db.exec("DROP TABLE messages");
    db.exec("ALTER TABLE messages_new RENAME TO messages");
    db.exec("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id)");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA foreign_key_check(messages)");
}
