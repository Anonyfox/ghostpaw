import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
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

describe("getSession", () => {
  it("returns a session by id", () => {
    const created = createSession(db, "k");
    const found = getSession(db, created.id);
    ok(found);
    strictEqual(found.id, created.id);
    strictEqual(found.key, "k");
    strictEqual(found.purpose, "chat");
  });

  it("returns null for a non-existent id", () => {
    const found = getSession(db, 99999);
    strictEqual(found, null);
  });

  it("returns the session even when closed", () => {
    const created = createSession(db, "k");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), created.id);
    const found = getSession(db, created.id);
    ok(found);
    ok(found.closedAt !== null);
  });

  it("returns the session even when distilled", () => {
    const created = createSession(db, "k");
    db.prepare("UPDATE sessions SET distilled_at = ? WHERE id = ?").run(Date.now(), created.id);
    const found = getSession(db, created.id);
    ok(found);
    ok(found.distilledAt !== null);
  });

  it("reflects updated token counts", () => {
    const created = createSession(db, "k");
    db.prepare(
      "UPDATE sessions SET tokens_in = 100, tokens_out = 50, cost_usd = 0.01 WHERE id = ?",
    ).run(created.id);
    const found = getSession(db, created.id);
    ok(found);
    strictEqual(found.tokensIn, 100);
    strictEqual(found.tokensOut, 50);
    strictEqual(found.costUsd, 0.01);
  });

  it("reflects head_message_id when set", () => {
    const created = createSession(db, "k");
    db.prepare(
      "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
    ).run(created.id, "user", "hello", Date.now());
    const msgId = (db.prepare("SELECT id FROM messages").get() as { id: number }).id;
    db.prepare("UPDATE sessions SET head_message_id = ? WHERE id = ?").run(msgId, created.id);
    const found = getSession(db, created.id);
    ok(found);
    strictEqual(found.headMessageId, msgId);
  });
});
