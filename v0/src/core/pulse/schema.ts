import type { DatabaseHandle } from "../../lib/database_handle.ts";

export const PULSE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS pulses (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL UNIQUE,
  type           TEXT    NOT NULL CHECK(type IN ('builtin', 'agent', 'shell')),
  command        TEXT    NOT NULL,
  interval_ms    INTEGER,
  cron_expr      TEXT,
  timeout_ms     INTEGER NOT NULL DEFAULT 300000,
  enabled        INTEGER NOT NULL DEFAULT 1,
  next_run_at    TEXT    NOT NULL,
  running        INTEGER NOT NULL DEFAULT 0,
  running_pid    INTEGER,
  started_at     TEXT,
  last_run_at    TEXT,
  last_exit_code INTEGER,
  run_count      INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE IF NOT EXISTS pulse_runs (
  id            INTEGER PRIMARY KEY,
  pulse_id      INTEGER NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  pulse_name    TEXT    NOT NULL,
  session_id    INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  started_at    TEXT    NOT NULL,
  finished_at   TEXT,
  duration_ms   INTEGER,
  exit_code     INTEGER,
  error         TEXT,
  output        TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_pulse_runs_lookup
  ON pulse_runs(pulse_id, started_at DESC);
`;

export function initPulseTables(db: DatabaseHandle): void {
  db.exec(PULSE_SCHEMA_SQL);
}
