import type { DatabaseHandle } from "../../lib/index.ts";

export function initScheduleTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id             INTEGER PRIMARY KEY,
      name           TEXT    NOT NULL UNIQUE,
      type           TEXT    NOT NULL CHECK(type IN ('builtin', 'custom')),
      command        TEXT    NOT NULL,
      interval_ms    INTEGER NOT NULL,
      enabled        INTEGER NOT NULL DEFAULT 1,
      next_run_at    INTEGER NOT NULL,
      running_pid    INTEGER,
      last_run_at    INTEGER,
      last_exit_code INTEGER,
      last_error     TEXT,
      run_count      INTEGER NOT NULL DEFAULT 0,
      fail_count     INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL
    )
  `);
}
