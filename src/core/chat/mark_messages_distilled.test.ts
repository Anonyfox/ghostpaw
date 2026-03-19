import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { markMessagesDistilled } from "./mark_messages_distilled.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("markMessagesDistilled", () => {
  it("returns 0 for session with no messages", () => {
    const s = createSession(db, "k");
    strictEqual(markMessagesDistilled(db, s.id), 0);
  });

  it("marks all undistilled messages", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "a" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "b" });

    const count = markMessagesDistilled(db, s.id);
    strictEqual(count, 2);

    const remaining = db
      .prepare("SELECT COUNT(*) AS cnt FROM messages WHERE session_id = ? AND distilled = 0")
      .get(s.id) as { cnt: number };
    strictEqual(remaining.cnt, 0);
  });

  it("does not double-mark already distilled messages", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "a" });

    markMessagesDistilled(db, s.id);
    const second = markMessagesDistilled(db, s.id);
    strictEqual(second, 0);
  });

  it("returns 0 for nonexistent session", () => {
    strictEqual(markMessagesDistilled(db, 999), 0);
  });
});
