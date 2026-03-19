import { ok, strictEqual } from "node:assert";
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
  it("stores a message, updates head and last_active_at", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    ok(msg.id > 0);
    strictEqual(msg.role, "user");
    strictEqual(msg.content, "hello");
    strictEqual(msg.isCompaction, false);
    const updated = getSession(db, session.id);
    ok(updated);
    strictEqual(updated.headMessageId, msg.id);
    ok(updated.lastActiveAt >= session.lastActiveAt);
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

  it("stores compaction messages with the flag set", () => {
    const session = createSession(db, "k");
    const msg = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "summary",
      isCompaction: true,
    });
    strictEqual(msg.isCompaction, true);
  });

  it("resets distilled_at when adding to a distilled session", () => {
    const session = createSession(db, "k");
    db.prepare("UPDATE sessions SET distilled_at = ? WHERE id = ?").run(Date.now(), session.id);
    ok(getSession(db, session.id)!.distilledAt !== null);
    addMessage(db, { sessionId: session.id, role: "user", content: "continued" });
    strictEqual(getSession(db, session.id)!.distilledAt, null);
  });
});
