import { ok } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initMemoryTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("initMemoryTable", () => {
  it("creates the memories table", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
      .get();
    ok(row, "memories table should exist");
  });

  it("is idempotent (calling twice does not throw)", () => {
    initMemoryTable(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
      .get();
    ok(row, "memories table should still exist after second init");
  });

  it("creates the idx_memories_active index", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_memories_active'")
      .get();
    ok(row, "idx_memories_active index should exist");
  });

  it("creates the idx_memories_stale index", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_memories_stale'")
      .get();
    ok(row, "idx_memories_stale index should exist");
  });

  it("creates the idx_memories_category index", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_memories_category'")
      .get();
    ok(row, "idx_memories_category index should exist");
  });

  it("creates the idx_memories_confidence index", () => {
    const row = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_memories_confidence'",
      )
      .get();
    ok(row, "idx_memories_confidence index should exist");
  });

  it("creates the memories_fts virtual table", () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memories_fts'")
      .get();
    ok(row, "memories_fts virtual table should exist");
  });

  it("syncs FTS index on insert via trigger", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category) VALUES (?, 0.9, 1, ?, ?, 'explicit', 'fact')",
    ).run("User likes pizza", now, now);
    const ftsRow = db
      .prepare("SELECT rowid, claim FROM memories_fts WHERE memories_fts MATCH ?")
      .get("pizza");
    ok(ftsRow, "FTS index should contain the inserted memory");
  });

  it("syncs FTS index on delete via trigger", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO memories (claim, confidence, evidence_count, created_at, verified_at, source, category) VALUES (?, 0.9, 1, ?, ?, 'explicit', 'fact')",
    ).run("User likes sushi", now, now);
    const id = db.prepare("SELECT id FROM memories WHERE claim = ?").get("User likes sushi")?.id;
    db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    const ftsRow = db
      .prepare("SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?")
      .all("sushi");
    ok(ftsRow.length === 0, "FTS index should not contain the deleted memory");
  });
});
