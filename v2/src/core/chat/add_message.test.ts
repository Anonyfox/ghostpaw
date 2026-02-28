import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
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

describe("addMessage", () => {
  it("stores a user message and returns it", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    ok(msg.id > 0);
    strictEqual(msg.sessionId, session.id);
    strictEqual(msg.role, "user");
    strictEqual(msg.content, "hello");
    strictEqual(msg.parentId, null);
    strictEqual(msg.model, null);
    strictEqual(msg.tokensIn, 0);
    strictEqual(msg.tokensOut, 0);
    strictEqual(msg.costUsd, 0);
    strictEqual(msg.isCompaction, false);
  });

  it("updates the session head_message_id", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.headMessageId, msg.id);
  });

  it("updates the session last_active_at", () => {
    const session = createSession(db, "k");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(1000, session.id);
    const before = Date.now();
    addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const updated = getSession(db, session.id);
    ok(updated);
    ok(updated.lastActiveAt >= before);
  });

  it("chains messages via parentId", () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "first" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "second",
      parentId: m1.id,
    });
    strictEqual(m2.parentId, m1.id);
    strictEqual(getSession(db, session.id)!.headMessageId, m2.id);
  });

  it("accepts token and cost values", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "response",
      model: "gpt-4o",
      tokensIn: 500,
      tokensOut: 200,
      costUsd: 0.01,
    });
    strictEqual(msg.tokensIn, 500);
    strictEqual(msg.tokensOut, 200);
    strictEqual(msg.costUsd, 0.01);
    strictEqual(msg.model, "gpt-4o");
  });

  it("stores compaction messages with the flag set", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "summary",
      isCompaction: true,
    });
    strictEqual(msg.isCompaction, true);
    const row = db.prepare("SELECT is_compaction FROM messages WHERE id = ?").get(msg.id);
    strictEqual(row!.is_compaction, 1);
  });

  it("rejects messages for non-existent sessions", () => {
    throws(
      () => addMessage(db, { sessionId: 99999, role: "user", content: "orphan" }),
      /FOREIGN KEY/i,
    );
  });

  it("rejects invalid role", () => {
    const session = createSession(db, "k");
    throws(
      () =>
        addMessage(db, {
          sessionId: session.id,
          role: "system" as "user",
          content: "invalid",
        }),
      /CHECK/i,
    );
  });

  it("persists the message to the database", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "persisted" });
    const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(msg.id);
    ok(row);
    strictEqual(row.content, "persisted");
    strictEqual(row.role, "user");
  });
});
