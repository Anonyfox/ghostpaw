import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { migrateHauntsToSessions } from "./migrate_haunts.ts";
import { initChatTables } from "./schema.ts";

describe("migrateHauntsToSessions", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
  });

  it("copies haunt summaries to session display_name and drops table", () => {
    const session = createSession(db, "haunt:1", { purpose: "haunt" });
    db.exec(`
      CREATE TABLE haunts (
        id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
        raw_journal TEXT NOT NULL,
        summary TEXT NOT NULL,
        seeded_memory_ids TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL
      )
    `);
    db.prepare(
      "INSERT INTO haunts (session_id, raw_journal, summary, created_at) VALUES (?, ?, ?, ?)",
    ).run(session.id, "journal text", "A summary of the haunt", Date.now());

    migrateHauntsToSessions(db);

    const updated = getSession(db, session.id as number);
    strictEqual(updated?.displayName, "A summary of the haunt");

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='haunts'")
      .get() as { name: string } | undefined;
    strictEqual(table, undefined);
  });

  it("is a no-op when haunts table does not exist", () => {
    migrateHauntsToSessions(db);
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='haunts'")
      .get() as { name: string } | undefined;
    strictEqual(table, undefined);
  });

  it("does not overwrite existing display_name", () => {
    const session = createSession(db, "haunt:2", { purpose: "haunt" });
    db.prepare("UPDATE sessions SET display_name = ? WHERE id = ?").run("kept", session.id);

    db.exec(`
      CREATE TABLE haunts (
        id INTEGER PRIMARY KEY,
        session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
        raw_journal TEXT NOT NULL,
        summary TEXT NOT NULL,
        seeded_memory_ids TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL
      )
    `);
    db.prepare(
      "INSERT INTO haunts (session_id, raw_journal, summary, created_at) VALUES (?, ?, ?, ?)",
    ).run(session.id, "journal", "would-overwrite", Date.now());

    migrateHauntsToSessions(db);

    const updated = getSession(db, session.id as number);
    strictEqual(updated?.displayName, "kept");
  });
});
