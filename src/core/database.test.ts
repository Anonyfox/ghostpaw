import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "./database.js";

let db: GhostpawDatabase;

beforeEach(async () => {
  db = await createDatabase(":memory:");
});

describe("createDatabase", () => {
  it("returns a database object with sqlite and close", async () => {
    ok(db.sqlite);
    ok(typeof db.close === "function");
  });

  it("creates the sessions table", () => {
    const rows = db.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")
      .all();
    strictEqual(rows.length, 1);
  });

  it("creates the messages table", () => {
    const rows = db.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
      .all();
    strictEqual(rows.length, 1);
  });

  it("creates the memory table", () => {
    const rows = db.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory'")
      .all();
    strictEqual(rows.length, 1);
  });

  it("enables WAL mode (on file-backed databases)", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "ghostpaw-wal-"));
    try {
      const fileDb = await createDatabase(join(dir, "test.db"));
      const result = fileDb.sqlite.prepare("PRAGMA journal_mode").get() as Record<string, unknown>;
      strictEqual(result.journal_mode, "wal");
      fileDb.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("enables foreign keys", () => {
    const result = db.sqlite.prepare("PRAGMA foreign_keys").get() as Record<string, unknown>;
    strictEqual(result.foreign_keys, 1);
  });

  it("close() shuts down the connection", () => {
    db.close();
    ok(true);
  });
});

describe("schema - sessions table", () => {
  it("can insert and retrieve a session", () => {
    db.sqlite
      .prepare(
        `INSERT INTO sessions (id, key, created_at, last_active, model)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run("s1", "test-session", Date.now(), Date.now(), "anthropic/claude-sonnet-4");

    const row = db.sqlite.prepare("SELECT * FROM sessions WHERE id = ?").get("s1") as Record<
      string,
      unknown
    >;
    strictEqual(row.id, "s1");
    strictEqual(row.key, "test-session");
    strictEqual(row.tokens_in, 0);
    strictEqual(row.tokens_out, 0);
  });

  it("enforces unique key constraint", () => {
    const now = Date.now();
    db.sqlite
      .prepare("INSERT INTO sessions (id, key, created_at, last_active) VALUES (?, ?, ?, ?)")
      .run("s1", "k1", now, now);

    let threw = false;
    try {
      db.sqlite
        .prepare("INSERT INTO sessions (id, key, created_at, last_active) VALUES (?, ?, ?, ?)")
        .run("s2", "k1", now, now);
    } catch {
      threw = true;
    }
    ok(threw, "Should throw on duplicate key");
  });
});

describe("schema - messages table", () => {
  it("can insert and retrieve a message", () => {
    const now = Date.now();
    db.sqlite
      .prepare("INSERT INTO sessions (id, key, created_at, last_active) VALUES (?, ?, ?, ?)")
      .run("s1", "k1", now, now);

    db.sqlite
      .prepare(
        `INSERT INTO messages (id, session_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run("m1", "s1", "user", "hello", now);

    const msg = db.sqlite.prepare("SELECT * FROM messages WHERE id = ?").get("m1") as Record<
      string,
      unknown
    >;
    strictEqual(msg.role, "user");
    strictEqual(msg.content, "hello");
    strictEqual(msg.is_compaction, 0);
  });

  it("supports parent_id for tree structure", () => {
    const now = Date.now();
    db.sqlite
      .prepare("INSERT INTO sessions (id, key, created_at, last_active) VALUES (?, ?, ?, ?)")
      .run("s1", "k1", now, now);
    db.sqlite
      .prepare(
        "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("m1", "s1", "user", "hello", now);
    db.sqlite
      .prepare(
        "INSERT INTO messages (id, session_id, parent_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("m2", "s1", "m1", "assistant", "hi", now);

    const child = db.sqlite
      .prepare("SELECT parent_id FROM messages WHERE id = ?")
      .get("m2") as Record<string, unknown>;
    strictEqual(child.parent_id, "m1");
  });

  it("enforces foreign key to sessions", () => {
    let threw = false;
    try {
      db.sqlite
        .prepare(
          "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run("m1", "nonexistent", "user", "x", Date.now());
    } catch {
      threw = true;
    }
    ok(threw, "Should throw on invalid session_id FK");
  });
});

describe("schema - memory table", () => {
  it("can store and retrieve memory entries", () => {
    const now = Date.now();
    db.sqlite
      .prepare("INSERT INTO memory (id, content, created_at, source) VALUES (?, ?, ?, ?)")
      .run("mem1", "user likes cats", now, "conversation");

    const row = db.sqlite.prepare("SELECT * FROM memory WHERE id = ?").get("mem1") as Record<
      string,
      unknown
    >;
    strictEqual(row.content, "user likes cats");
    strictEqual(row.source, "conversation");
  });

  it("embedding column can store blobs", () => {
    const now = Date.now();
    const embedding = Buffer.from(new Float32Array([0.1, 0.2, 0.3]).buffer);
    db.sqlite
      .prepare(
        "INSERT INTO memory (id, content, embedding, created_at, source) VALUES (?, ?, ?, ?, ?)",
      )
      .run("mem1", "test", embedding, now, "manual");

    const row = db.sqlite
      .prepare("SELECT embedding FROM memory WHERE id = ?")
      .get("mem1") as Record<string, unknown>;
    ok(row.embedding instanceof Uint8Array);
  });
});

describe("raw sqlite integration", () => {
  it("can query through raw sqlite interface", () => {
    const now = Date.now();
    db.sqlite
      .prepare("INSERT INTO sessions (id, key, created_at, last_active) VALUES (?, ?, ?, ?)")
      .run("s1", "k1", now, now);

    const row = db.sqlite.prepare("SELECT id, key FROM sessions WHERE id = ?").get("s1") as Record<
      string,
      unknown
    >;
    strictEqual(row.id, "s1");
    strictEqual(row.key, "k1");
  });
});
