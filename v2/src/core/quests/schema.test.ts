import { ok, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("initQuestTables", () => {
  it("creates all three tables", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('quests','quest_logs','quest_occurrences') ORDER BY name",
      )
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    ok(names.includes("quest_logs"));
    ok(names.includes("quests"));
    ok(names.includes("quest_occurrences"));
  });

  it("is idempotent", () => {
    initQuestTables(db);
    initQuestTables(db);
  });

  it("accepts offered quest status", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("board quest", "offered", now, "human", now);
    const row = db
      .prepare("SELECT status FROM quests WHERE title = 'board quest'")
      .get() as { status: string };
    ok(row.status === "offered");
  });

  it("rejects invalid quest status", () => {
    const now = Date.now();
    throws(() => {
      db.prepare(
        "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run("test", "invalid", now, "human", now);
    });
  });

  it("rejects invalid quest priority", () => {
    const now = Date.now();
    throws(() => {
      db.prepare(
        "INSERT INTO quests (title, priority, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run("test", "critical", now, "human", now);
    });
  });

  it("rejects invalid quest_log status", () => {
    const now = Date.now();
    throws(() => {
      db.prepare(
        "INSERT INTO quest_logs (title, status, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run("test", "invalid", now, "human", now);
    });
  });

  it("enforces quest_log_id FK", () => {
    const now = Date.now();
    throws(() => {
      db.prepare(
        "INSERT INTO quests (title, quest_log_id, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run("test", 999, now, "human", now);
    });
  });

  it("enforces quest_occurrences quest_id FK", () => {
    const now = Date.now();
    throws(() => {
      db.prepare(
        "INSERT INTO quest_occurrences (quest_id, occurrence_at, completed_at) VALUES (?, ?, ?)",
      ).run(999, now, now);
    });
  });

  it("enforces UNIQUE(quest_id, occurrence_at) on occurrences", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, created_at, created_by, updated_at) VALUES (?, ?, ?, ?)",
    ).run("recurring", now, "human", now);
    const questId = (
      db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }
    ).id;
    db.prepare(
      "INSERT INTO quest_occurrences (quest_id, occurrence_at, completed_at) VALUES (?, ?, ?)",
    ).run(questId, now, now);
    throws(() => {
      db.prepare(
        "INSERT INTO quest_occurrences (quest_id, occurrence_at, completed_at) VALUES (?, ?, ?)",
      ).run(questId, now, now);
    });
  });

  it("creates FTS5 virtual table for quests", () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='quests_fts'",
      )
      .all() as { name: string }[];
    ok(tables.length === 1);
  });

  it("FTS trigger fires on insert", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, description, created_at, created_by, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("deploy v3", "rollout to production", now, "human", now);
    const hits = db
      .prepare("SELECT rowid FROM quests_fts WHERE quests_fts MATCH 'deploy'")
      .all();
    ok(hits.length === 1);
  });
});
