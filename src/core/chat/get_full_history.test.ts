import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { getFullHistory } from "./get_full_history.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getFullHistory", () => {
  it("returns empty array for a session with no messages", () => {
    const session = createSession(db, "k");
    strictEqual(getFullHistory(db, session.id).length, 0);
  });

  it("returns empty array for non-existent session", () => {
    strictEqual(getFullHistory(db, 99999).length, 0);
  });

  it("walks past compaction markers to return the entire chain", () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "old-1" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "old-2",
      parentId: m1.id,
    });
    const compaction = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "summary",
      parentId: m2.id,
      isCompaction: true,
    });
    const m4 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "new-1",
      parentId: compaction.id,
    });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "new-2",
      parentId: m4.id,
    });

    const history = getFullHistory(db, session.id);
    strictEqual(history.length, 5);
    strictEqual(history[0]!.content, "old-1");
    strictEqual(history[1]!.content, "old-2");
    strictEqual(history[2]!.content, "summary");
    strictEqual(history[2]!.isCompaction, true);
    strictEqual(history[3]!.content, "new-1");
    strictEqual(history[4]!.content, "new-2");
  });

  it("walks past multiple compaction markers", () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "ancient" });
    const c1 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "first summary",
      parentId: m1.id,
      isCompaction: true,
    });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "middle",
      parentId: c1.id,
    });
    const c2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "second summary",
      parentId: m2.id,
      isCompaction: true,
    });
    addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "recent",
      parentId: c2.id,
    });

    const history = getFullHistory(db, session.id);
    strictEqual(history.length, 5);
    strictEqual(history[0]!.content, "ancient");
    strictEqual(history[4]!.content, "recent");
  });
});
