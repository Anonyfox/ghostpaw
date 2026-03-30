export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id                      INTEGER PRIMARY KEY,
  title                   TEXT,
  model                   TEXT NOT NULL,
  system_prompt           TEXT NOT NULL,
  purpose                 TEXT NOT NULL DEFAULT 'chat',
  parent_session_id       INTEGER REFERENCES sessions(id),
  triggered_by_message_id INTEGER,
  head_message_id         INTEGER,
  soul_id                 INTEGER,
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE IF NOT EXISTS messages (
  id               INTEGER PRIMARY KEY,
  session_id       INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  ordinal          INTEGER NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
  content          TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'organic',
  tool_call_id     TEXT,
  parent_id        INTEGER,
  is_compaction    INTEGER NOT NULL DEFAULT 0,
  sealed_at        TEXT,
  model            TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  cached_tokens    INTEGER,
  reasoning_tokens INTEGER,
  cost_usd         REAL,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(session_id, ordinal)
) STRICT;

CREATE TABLE IF NOT EXISTS tool_calls (
  id          TEXT PRIMARY KEY,
  message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  arguments   TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, ordinal);
CREATE INDEX IF NOT EXISTS idx_messages_sealed ON messages(id) WHERE sealed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);

CREATE TABLE IF NOT EXISTS shade_impressions (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id),
  sealed_msg_id   INTEGER NOT NULL,
  soul_id         INTEGER NOT NULL,
  impressions     TEXT NOT NULL DEFAULT '',
  impression_count INTEGER NOT NULL DEFAULT 0,
  ingest_session_id INTEGER,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(sealed_msg_id)
) STRICT;

CREATE TABLE IF NOT EXISTS shade_runs (
  id              INTEGER PRIMARY KEY,
  impression_id   INTEGER NOT NULL REFERENCES shade_impressions(id),
  processor       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  result_count    INTEGER,
  process_session_id INTEGER,
  error           TEXT,
  started_at      TEXT,
  finished_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(impression_id, processor)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_shade_impressions_session_seal ON shade_impressions(session_id, sealed_msg_id);
CREATE INDEX IF NOT EXISTS idx_shade_impressions_soul ON shade_impressions(soul_id);
CREATE INDEX IF NOT EXISTS idx_shade_runs_impression ON shade_runs(impression_id);
CREATE INDEX IF NOT EXISTS idx_shade_runs_processor ON shade_runs(processor, status);
`;
