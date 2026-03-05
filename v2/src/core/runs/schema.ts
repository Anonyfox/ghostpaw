import type { DatabaseHandle } from "../../lib/index.ts";

export function initRunsTable(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS delegation_runs (
      id                INTEGER PRIMARY KEY,
      parent_session_id INTEGER NOT NULL REFERENCES sessions(id),
      child_session_id  INTEGER REFERENCES sessions(id),
      specialist        TEXT    NOT NULL DEFAULT 'default',
      model             TEXT    NOT NULL,
      task              TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'running'
                        CHECK(status IN ('running', 'completed', 'failed')),
      result            TEXT,
      error             TEXT,
      tokens_in         INTEGER NOT NULL DEFAULT 0,
      tokens_out        INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens  INTEGER NOT NULL DEFAULT 0,
      cached_tokens     INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL    NOT NULL DEFAULT 0,
      created_at        INTEGER NOT NULL,
      completed_at      INTEGER
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_delegation_runs_parent ON delegation_runs(parent_session_id)",
  );

  const cols = db.prepare("PRAGMA table_info(delegation_runs)").all() as { name: string }[];
  const addCol = (name: string, def: string) => {
    if (!cols.some((c) => c.name === name))
      db.exec(`ALTER TABLE delegation_runs ADD COLUMN ${def}`);
  };
  addCol("reasoning_tokens", "reasoning_tokens INTEGER NOT NULL DEFAULT 0");
  addCol("cached_tokens", "cached_tokens INTEGER NOT NULL DEFAULT 0");
}
