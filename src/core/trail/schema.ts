import type { DatabaseHandle } from "../../lib/index.ts";

export function initTrailTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_chronicle (
      id              INTEGER PRIMARY KEY,
      date            TEXT    NOT NULL UNIQUE,
      title           TEXT    NOT NULL,
      chapter_id      INTEGER REFERENCES trail_chapters(id),
      narrative       TEXT    NOT NULL,
      highlights      TEXT,
      surprises       TEXT,
      unresolved      TEXT,
      source_slices   TEXT,
      created_at      INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_chapters (
      id              INTEGER PRIMARY KEY,
      label           TEXT    NOT NULL,
      description     TEXT,
      started_at      INTEGER NOT NULL,
      ended_at        INTEGER,
      momentum        TEXT    NOT NULL DEFAULT 'stable'
                      CHECK(momentum IN ('rising','stable','declining','shifting')),
      confidence      REAL    NOT NULL DEFAULT 0.5,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_trailmarks (
      id              INTEGER PRIMARY KEY,
      chronicle_id    INTEGER REFERENCES trail_chronicle(id),
      chapter_id      INTEGER REFERENCES trail_chapters(id),
      kind            TEXT    NOT NULL
                      CHECK(kind IN ('turning_point','milestone','shift','first')),
      description     TEXT    NOT NULL,
      significance    REAL    NOT NULL DEFAULT 0.5,
      created_at      INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_pairing_wisdom (
      id              INTEGER PRIMARY KEY,
      category        TEXT    NOT NULL
                      CHECK(category IN (
                        'tone','framing','timing','initiative',
                        'workflow','boundaries','operational','other'
                      )),
      pattern         TEXT    NOT NULL,
      guidance        TEXT    NOT NULL,
      evidence_count  INTEGER NOT NULL DEFAULT 1,
      confidence      REAL    NOT NULL DEFAULT 0.3,
      hit_count       INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_open_loops (
      id                  INTEGER PRIMARY KEY,
      description         TEXT    NOT NULL,
      category            TEXT    NOT NULL DEFAULT 'organic'
                          CHECK(category IN ('organic','curiosity')),
      source_type         TEXT,
      source_id           TEXT,
      significance        REAL    NOT NULL DEFAULT 0.5,
      status              TEXT    NOT NULL DEFAULT 'alive'
                          CHECK(status IN ('alive','dormant','resolved','dismissed')),
      recommended_action  TEXT
                          CHECK(recommended_action IN ('ask','revisit','remind','wait','leave')),
      earliest_resurface  INTEGER,
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_starter_questions (
      id          INTEGER PRIMARY KEY,
      question    TEXT    NOT NULL,
      priority    INTEGER NOT NULL DEFAULT 0,
      tier        TEXT    NOT NULL DEFAULT 'starter'
                  CHECK(tier IN ('starter','observation','depth')),
      loop_id     INTEGER REFERENCES trail_open_loops(id),
      resolved_at INTEGER,
      seeded_at   INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_calibration (
      id              INTEGER PRIMARY KEY,
      key             TEXT    NOT NULL UNIQUE,
      value           REAL    NOT NULL,
      domain          TEXT,
      evidence_count  INTEGER NOT NULL DEFAULT 1,
      trajectory      TEXT    DEFAULT 'stable'
                      CHECK(trajectory IN ('rising','stable','falling')),
      updated_at      INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_omens (
      id               INTEGER PRIMARY KEY,
      forecast         TEXT    NOT NULL,
      confidence       REAL    NOT NULL,
      horizon          INTEGER,
      resolved_at      INTEGER,
      outcome          TEXT,
      prediction_error REAL,
      created_at       INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_preamble (
      id              INTEGER PRIMARY KEY,
      text            TEXT    NOT NULL,
      version         INTEGER NOT NULL DEFAULT 1,
      compiled_at     INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trail_sweep_state (
      id              INTEGER PRIMARY KEY CHECK(id = 1),
      last_sweep_at   INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_trail_chronicle_date ON trail_chronicle(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_trail_chronicle_chapter ON trail_chronicle(chapter_id)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_chapters_active ON trail_chapters(ended_at) WHERE ended_at IS NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_trailmarks_chronicle ON trail_trailmarks(chronicle_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_trailmarks_chapter ON trail_trailmarks(chapter_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_pairing_wisdom_category ON trail_pairing_wisdom(category)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_open_loops_status ON trail_open_loops(status, significance)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_open_loops_resurface ON trail_open_loops(earliest_resurface) WHERE status = 'alive'",
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_trail_calibration_key ON trail_calibration(key)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_omens_unresolved ON trail_omens(created_at) WHERE resolved_at IS NULL",
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_trail_preamble_latest ON trail_preamble(compiled_at)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_open_loops_category ON trail_open_loops(category, status)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_trail_starter_unresolved ON trail_starter_questions(tier) WHERE resolved_at IS NULL",
  );
}
