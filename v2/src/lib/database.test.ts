import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "./database.ts";
import { openDatabase, openTestDatabase } from "./database.ts";

describe("openTestDatabase", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("opens an in-memory database that supports basic operations", () => {
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");
    db.prepare("INSERT INTO test (id, name) VALUES (?, ?)").run(1, "alice");
    const row = db.prepare("SELECT id, name FROM test WHERE id = ?").get(1);
    ok(row);
    strictEqual(row.id, 1);
    strictEqual(row.name, "alice");
  });

  it("returns results from .all()", () => {
    db.exec("CREATE TABLE items (val TEXT)");
    db.prepare("INSERT INTO items (val) VALUES (?)").run("a");
    db.prepare("INSERT INTO items (val) VALUES (?)").run("b");
    const rows = db.prepare("SELECT val FROM items ORDER BY val").all();
    strictEqual(rows.length, 2);
    strictEqual(rows[0]!.val, "a");
    strictEqual(rows[1]!.val, "b");
  });

  it("has foreign_keys enabled", () => {
    const row = db.prepare("PRAGMA foreign_keys").get();
    ok(row);
    strictEqual(row.foreign_keys, 1);
  });
});

describe("openDatabase", () => {
  it("sets WAL journal mode for file-based databases", async () => {
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { unlinkSync } = await import("node:fs");

    const path = join(tmpdir(), `ghostpaw-test-${Date.now()}.db`);
    const db = await openDatabase(path);
    try {
      const row = db.prepare("PRAGMA journal_mode").get();
      ok(row);
      strictEqual(row.journal_mode, "wal");
    } finally {
      db.close();
      try {
        unlinkSync(path);
      } catch {}
      try {
        unlinkSync(`${path}-wal`);
      } catch {}
      try {
        unlinkSync(`${path}-shm`);
      } catch {}
    }
  });
});

describe("database handle after close", () => {
  it("throws when executing SQL on a closed handle", async () => {
    const db = await openTestDatabase();
    db.close();
    throws(() => db.exec("SELECT 1"), /database/i);
  });
});
