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
  it("creates sessions with all 20 columns", () => {
    initChatTables(db);
    const cols = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    strictEqual(cols.length, 20);
    const names = new Set(cols.map((c) => c.name));
    for (const expected of [
      "id",
      "key",
      "purpose",
      "model",
      "display_name",
      "created_at",
      "last_active_at",
      "tokens_in",
      "tokens_out",
      "reasoning_tokens",
      "cached_tokens",
      "cost_usd",
      "head_message_id",
      "closed_at",
      "distilled_at",
      "parent_session_id",
      "soul_id",
      "quest_id",
      "xp_earned",
      "error",
    ]) {
      ok(names.has(expected), `missing column: ${expected}`);
    }
  });

  it("creates messages with all 15 columns", () => {
    initChatTables(db);
    const cols = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
    strictEqual(cols.length, 15);
    const names = new Set(cols.map((c) => c.name));
    for (const expected of [
      "id",
      "session_id",
      "parent_id",
      "role",
      "content",
      "model",
      "tokens_in",
      "tokens_out",
      "reasoning_tokens",
      "cached_tokens",
      "cost_usd",
      "created_at",
      "is_compaction",
      "tool_data",
      "distilled",
    ]) {
      ok(names.has(expected), `missing column: ${expected}`);
    }
  });

  it("is idempotent", () => {
    initChatTables(db);
    initChatTables(db);
    strictEqual((db.prepare("PRAGMA table_info(sessions)").all() as unknown[]).length, 20);
    strictEqual((db.prepare("PRAGMA table_info(messages)").all() as unknown[]).length, 15);
  });

  it("enforces NOT NULL on session key and timestamps", () => {
    initChatTables(db);
    const now = Date.now();
    throws(
      () =>
        db
          .prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)")
          .run(null, now, now),
      /NOT NULL/i,
    );
    throws(
      () =>
        db
          .prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)")
          .run("k", null, now),
      /NOT NULL/i,
    );
  });

  it("defaults purpose to chat, counters to zero, nullable fields to null", () => {
    initChatTables(db);
    const now = Date.now();
    db.prepare("INSERT INTO sessions (key, created_at, last_active_at) VALUES (?, ?, ?)").run(
      "k",
      now,
      now,
    );
    const row = db
      .prepare(
        "SELECT purpose, tokens_in, tokens_out, cost_usd, xp_earned, model, closed_at, distilled_at, head_message_id, display_name, parent_session_id, soul_id, error FROM sessions",
      )
      .get() as Record<string, unknown>;
    strictEqual(row.purpose, "chat");
    strictEqual(row.tokens_in, 0);
    strictEqual(row.tokens_out, 0);
    strictEqual(row.cost_usd, 0);
    strictEqual(row.xp_earned, 0);
    strictEqual(row.model, null);
    strictEqual(row.closed_at, null);
    strictEqual(row.parent_session_id, null);
    strictEqual(row.soul_id, null);
    strictEqual(row.error, null);
  });

  it("enforces role CHECK constraint on messages", () => {
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
    for (const role of ["user", "assistant", "tool_call", "tool_result"]) {
      db.prepare(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
      ).run(sid, role, "text", now);
    }
    strictEqual((db.prepare("SELECT COUNT(*) AS c FROM messages").get() as { c: number }).c, 4);
  });

  it("enforces foreign keys on messages", () => {
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

  it("creates all expected indices", () => {
    initChatTables(db);
    const sessionIdx = (db.prepare("PRAGMA index_list(sessions)").all() as { name: string }[]).map(
      (i) => i.name,
    );
    ok(sessionIdx.some((n) => n.includes("sessions_key")));
    ok(sessionIdx.some((n) => n.includes("sessions_purpose")));
    ok(sessionIdx.some((n) => n.includes("sessions_last_active")));
    ok(sessionIdx.some((n) => n.includes("sessions_parent")));
    ok(sessionIdx.some((n) => n.includes("sessions_closed")));
    ok(sessionIdx.some((n) => n.includes("sessions_distilled")));
    ok(sessionIdx.some((n) => n.includes("sessions_soul")));

    const msgIdx = (db.prepare("PRAGMA index_list(messages)").all() as { name: string }[]).map(
      (i) => i.name,
    );
    ok(msgIdx.some((n) => n.includes("messages_session_role")));
    ok(msgIdx.some((n) => n.includes("messages_parent")));
  });
});
