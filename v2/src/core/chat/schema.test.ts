import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

afterEach(() => {
  db.close();
});

describe("initChatTables", () => {
  it("creates the sessions table with expected columns", () => {
    initChatTables(db);
    const cols = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    ok(names.includes("id"));
    ok(names.includes("key"));
    ok(names.includes("purpose"));
    ok(names.includes("model"));
    ok(names.includes("created_at"));
    ok(names.includes("last_active_at"));
    ok(names.includes("tokens_in"));
    ok(names.includes("tokens_out"));
    ok(names.includes("cost_usd"));
    ok(names.includes("head_message_id"));
    ok(names.includes("closed_at"));
    ok(names.includes("absorbed_at"));
    ok(names.includes("display_name"));
    strictEqual(names.length, 13);
  });

  it("creates the messages table with expected columns", () => {
    initChatTables(db);
    const cols = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    ok(names.includes("id"));
    ok(names.includes("session_id"));
    ok(names.includes("parent_id"));
    ok(names.includes("role"));
    ok(names.includes("content"));
    ok(names.includes("model"));
    ok(names.includes("tokens_in"));
    ok(names.includes("tokens_out"));
    ok(names.includes("cost_usd"));
    ok(names.includes("created_at"));
    ok(names.includes("is_compaction"));
    strictEqual(names.length, 11);
  });

  it("is idempotent", () => {
    initChatTables(db);
    initChatTables(db);
    const sessionCols = db.prepare("PRAGMA table_info(sessions)").all();
    strictEqual(sessionCols.length, 13);
    const messageCols = db.prepare("PRAGMA table_info(messages)").all();
    strictEqual(messageCols.length, 11);
  });

  it("sessions id is an autoincrement integer primary key", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k1",
      now,
      now,
    );
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k2",
      now,
      now,
    );
    const rows = db.prepare("SELECT id FROM sessions ORDER BY id").all();
    strictEqual(rows.length, 2);
    ok((rows[0]!.id as number) < (rows[1]!.id as number));
  });

  it("sessions purpose defaults to 'chat'", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const row = db.prepare("SELECT purpose FROM sessions").get();
    strictEqual(row!.purpose, "chat");
  });

  it("sessions tokens_in defaults to 0", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const row = db.prepare("SELECT tokens_in, tokens_out, cost_usd FROM sessions").get();
    strictEqual(row!.tokens_in, 0);
    strictEqual(row!.tokens_out, 0);
    strictEqual(row!.cost_usd, 0);
  });

  it("sessions rejects null key", () => {
    initChatTables(db);
    throws(
      () =>
        db
          .prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)")
          .run(null, Date.now(), Date.now()),
      /NOT NULL/i,
    );
  });

  it("sessions rejects null created_at", () => {
    initChatTables(db);
    throws(
      () =>
        db
          .prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)")
          .run("k", null, Date.now()),
      /NOT NULL/i,
    );
  });

  it("sessions allows null model, closed_at, absorbed_at, head_message_id, display_name", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const row = db
      .prepare("SELECT model, closed_at, absorbed_at, head_message_id, display_name FROM sessions")
      .get();
    strictEqual(row!.model, null);
    strictEqual(row!.closed_at, null);
    strictEqual(row!.absorbed_at, null);
    strictEqual(row!.head_message_id, null);
    strictEqual(row!.display_name, null);
  });

  it("messages rejects invalid role", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const sid = (db.prepare("SELECT id FROM sessions").get() as { id: number }).id;
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
          )
          .run(sid, "system", "text", now),
      /CHECK/i,
    );
  });

  it("messages accepts 'user' and 'assistant' roles", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const sid = (db.prepare("SELECT id FROM sessions").get() as { id: number }).id;
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(sid, "user", "hello", now);
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(sid, "assistant", "hi", now);
    const rows = db.prepare("SELECT role FROM messages ORDER BY id").all();
    strictEqual(rows.length, 2);
    strictEqual(rows[0]!.role, "user");
    strictEqual(rows[1]!.role, "assistant");
  });

  it("messages rejects null content", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const sid = (db.prepare("SELECT id FROM sessions").get() as { id: number }).id;
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
          )
          .run(sid, "user", null, now),
      /NOT NULL/i,
    );
  });

  it("messages is_compaction defaults to 0", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const sid = (db.prepare("SELECT id FROM sessions").get() as { id: number }).id;
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(sid, "user", "hello", now);
    const row = db.prepare("SELECT is_compaction FROM messages").get();
    strictEqual(row!.is_compaction, 0);
  });

  it("messages foreign key references sessions", () => {
    initChatTables(db);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
          )
          .run(99999, "user", "orphan", Date.now()),
      /FOREIGN KEY/i,
    );
  });

  it("messages parent_id foreign key references messages", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const sid = (db.prepare("SELECT id FROM sessions").get() as { id: number }).id;
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO messages (session_id, parent_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(sid, 99999, "user", "hello", now),
      /FOREIGN KEY/i,
    );
  });

  it("creates sessions indexes", () => {
    initChatTables(db);
    const indexes = db.prepare("PRAGMA index_list(sessions)").all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    ok(names.some((n) => n.includes("sessions_key")));
    ok(names.some((n) => n.includes("sessions_purpose")));
    ok(names.some((n) => n.includes("sessions_last_active")));
  });

  it("creates messages indexes", () => {
    initChatTables(db);
    const indexes = db.prepare("PRAGMA index_list(messages)").all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    ok(names.some((n) => n.includes("messages_session")));
    ok(names.some((n) => n.includes("messages_parent")));
  });
});
