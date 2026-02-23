import { DatabaseError } from "../lib/errors.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  token_budget INTEGER,
  model TEXT,
  head_message_id TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_id TEXT REFERENCES messages(id),
  role TEXT NOT NULL,
  content TEXT,
  model TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_compaction INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  content TEXT NOT NULL,
  embedding BLOB,
  created_at INTEGER NOT NULL,
  source TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  parent_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  agent_profile TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'pending',
  prompt TEXT,
  result TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  announced INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_memory_session ON memory(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_key ON sessions(key);
CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id);
CREATE INDEX IF NOT EXISTS idx_runs_parent_session ON runs(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
`;

interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
}

interface StatementSync {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

export interface GhostpawDatabase {
  sqlite: DatabaseSync;
  close(): void;
}

/**
 * node:sqlite's .get() returns an object with all null values instead of
 * undefined when no row matches. This guard normalizes that quirk.
 */
export function isNullRow(row: Record<string, unknown> | undefined): row is undefined {
  if (!row) return true;
  return Object.values(row).every((v) => v === null);
}

export async function createDatabase(pathOrMemory: string): Promise<GhostpawDatabase> {
  let DatabaseSyncCtor: new (path: string) => DatabaseSync;

  try {
    const mod = await import("node:sqlite");
    DatabaseSyncCtor = mod.DatabaseSync as unknown as new (path: string) => DatabaseSync;
  } catch (err) {
    throw new DatabaseError(
      "Failed to load node:sqlite. Ensure Node.js >= 22.5 with --experimental-sqlite flag.",
      { cause: err, hint: "Run with: node --experimental-sqlite your-script.js" },
    );
  }

  const sqlite = new DatabaseSyncCtor(pathOrMemory);

  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA busy_timeout = 5000");

  try {
    sqlite.exec(SCHEMA_SQL);
  } catch (err) {
    throw new DatabaseError("Failed to initialize database schema", { cause: err });
  }

  return {
    sqlite,
    close() {
      try {
        sqlite.close();
      } catch {
        // already closed
      }
    },
  };
}
