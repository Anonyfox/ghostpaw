import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { deleteSession } from "./delete_session.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("deleteSession", () => {
  it("deletes the session", () => {
    const session = createSession(db, "k");
    ok(getSession(db, session.id));
    deleteSession(db, session.id);
    strictEqual(getSession(db, session.id), null);
  });

  it("deletes all messages belonging to the session", () => {
    const session = createSession(db, "k");
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(session.id, "user", "hello", Date.now());
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(session.id, "assistant", "hi", Date.now());
    deleteSession(db, session.id);
    const msgs = db.prepare("SELECT * FROM messages WHERE session_id = ?").all(session.id);
    strictEqual(msgs.length, 0);
  });

  it("does not affect other sessions", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(s2.id, "user", "msg", Date.now());
    deleteSession(db, s1.id);
    ok(getSession(db, s2.id));
    const msgs = db.prepare("SELECT * FROM messages WHERE session_id = ?").all(s2.id);
    strictEqual(msgs.length, 1);
  });

  it("is a no-op for a non-existent session", () => {
    deleteSession(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});
