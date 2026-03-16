import type { DatabaseHandle } from "../../lib/index.ts";

const QUEST_STATUS_CHECK =
  "CHECK(status IN ('offered','accepted','active','blocked','done','failed','abandoned'))";
const QUEST_PRIORITY_CHECK = "CHECK(priority IN ('low','normal','high','urgent'))";
const STORYLINE_STATUS_CHECK = "CHECK(status IN ('active','completed','archived'))";

export function initQuestTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS storylines (
      id            INTEGER PRIMARY KEY,
      title         TEXT    NOT NULL,
      description   TEXT,
      status        TEXT    NOT NULL DEFAULT 'active'
                    ${STORYLINE_STATUS_CHECK},
      created_at    INTEGER NOT NULL,
      created_by    TEXT    NOT NULL DEFAULT 'human',
      updated_at    INTEGER NOT NULL,
      completed_at  INTEGER,
      due_at        INTEGER
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_storylines_status ON storylines(status)");

  db.exec(`
    CREATE TABLE IF NOT EXISTS quests (
      id            INTEGER PRIMARY KEY,
      title         TEXT    NOT NULL,
      description   TEXT,
      status        TEXT    NOT NULL DEFAULT 'accepted'
                    ${QUEST_STATUS_CHECK},
      priority      TEXT    NOT NULL DEFAULT 'normal'
                    ${QUEST_PRIORITY_CHECK},
      storyline_id  INTEGER REFERENCES storylines(id),
      tags          TEXT,
      created_at    INTEGER NOT NULL,
      created_by    TEXT    NOT NULL DEFAULT 'human',
      updated_at    INTEGER NOT NULL,
      starts_at     INTEGER,
      ends_at       INTEGER,
      due_at        INTEGER,
      remind_at     INTEGER,
      reminded_at   INTEGER,
      completed_at  INTEGER,
      rrule         TEXT
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_quests_storyline_id ON quests(storyline_id)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_quests_due_at ON quests(due_at) WHERE due_at IS NOT NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_quests_remind_at ON quests(remind_at) WHERE remind_at IS NOT NULL",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_quests_starts_at ON quests(starts_at) WHERE starts_at IS NOT NULL",
  );

  createFts(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS quest_occurrences (
      id            INTEGER PRIMARY KEY,
      quest_id      INTEGER NOT NULL REFERENCES quests(id),
      occurrence_at INTEGER NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'done'
                    CHECK(status IN ('done','skipped')),
      completed_at  INTEGER NOT NULL,
      UNIQUE(quest_id, occurrence_at)
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_quest_occurrences_quest ON quest_occurrences(quest_id, occurrence_at)",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS quest_subgoals (
      id         INTEGER PRIMARY KEY,
      quest_id   INTEGER NOT NULL REFERENCES quests(id),
      text       TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      done_at    INTEGER
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_quest_subgoals_quest_id ON quest_subgoals(quest_id)");
}

function createFts(db: DatabaseHandle): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS quests_fts USING fts5(
      title,
      description,
      content=quests,
      content_rowid=id
    )
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS quests_fts_insert
    AFTER INSERT ON quests BEGIN
      INSERT INTO quests_fts(rowid, title, description)
      VALUES (new.id, new.title, COALESCE(new.description, ''));
    END
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS quests_fts_delete
    AFTER DELETE ON quests BEGIN
      INSERT INTO quests_fts(quests_fts, rowid, title, description)
      VALUES ('delete', old.id, old.title, COALESCE(old.description, ''));
    END
  `);
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS quests_fts_update
    AFTER UPDATE OF title, description ON quests BEGIN
      INSERT INTO quests_fts(quests_fts, rowid, title, description)
      VALUES ('delete', old.id, old.title, COALESCE(old.description, ''));
      INSERT INTO quests_fts(rowid, title, description)
      VALUES (new.id, new.title, COALESCE(new.description, ''));
    END
  `);
}
