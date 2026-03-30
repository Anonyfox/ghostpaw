import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { addMessage } from "./messages.ts";
import { sealSessionTail } from "./seal_session_tail.ts";
import { createSession } from "./session.ts";

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
});

describe("sealSessionTail", () => {
  it("seals only the last message in an eligible session", () => {
    const session = createSession(db, "m", "p", {
      purpose: "subsystem_turn",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "hello");
    const lastId = addMessage(db, session.id, "assistant", "hi");

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 1, "should seal exactly one message");

    const rows = db
      .prepare("SELECT id, sealed_at FROM messages WHERE session_id = ? ORDER BY ordinal")
      .all(session.id) as Array<{ id: number; sealed_at: string | null }>;

    assert.strictEqual(rows[0].sealed_at, null, "first message should NOT be sealed");
    assert.ok(rows[1].sealed_at != null, "last message should be sealed");
    assert.strictEqual(rows[1].id, lastId);
  });

  it("returns 0 for non-sealable purpose", () => {
    const session = createSession(db, "m", "p", {
      purpose: "system",
    });
    addMessage(db, session.id, "user", "system message");

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 0);
  });

  it("returns 0 when soul_id is null", () => {
    const session = createSession(db, "m", "p", {
      purpose: "subsystem_turn",
    });
    addMessage(db, session.id, "user", "no soul");

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 0);
  });

  it("seals chat sessions when soul_id is set", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 2,
    });
    addMessage(db, session.id, "user", "chat message");
    addMessage(db, session.id, "assistant", "response");

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 1);
  });

  it("is idempotent: second call returns 0 when no new messages exist", () => {
    const session = createSession(db, "m", "p", {
      purpose: "pulse",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "pulse msg");

    const first = sealSessionTail(db, session.id);
    assert.strictEqual(first, 1);

    const second = sealSessionTail(db, session.id);
    assert.strictEqual(second, 0, "second seal should change nothing");
  });

  it("returns 0 for a session with no messages", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 0);
  });

  it("returns 0 for a nonexistent session", () => {
    const count = sealSessionTail(db, 999_999);
    assert.strictEqual(count, 0);
  });

  it("seals the new last message when called again after more messages are added", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "first");
    addMessage(db, session.id, "assistant", "reply");

    sealSessionTail(db, session.id);

    addMessage(db, session.id, "user", "second");
    const newLast = addMessage(db, session.id, "assistant", "reply2");

    const count = sealSessionTail(db, session.id);
    assert.strictEqual(count, 1);

    const row = db.prepare("SELECT sealed_at FROM messages WHERE id = ?").get(newLast) as {
      sealed_at: string | null;
    };
    assert.ok(row.sealed_at != null, "new last message should be sealed");

    const sealedCount = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND sealed_at IS NOT NULL")
      .get(session.id) as { c: number };
    assert.strictEqual(sealedCount.c, 2, "exactly two boundary seals should exist");
  });
});
