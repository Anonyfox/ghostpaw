import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { getHistory } from "./get_history.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getHistory", () => {
  it("returns empty array for a session with no messages", () => {
    const session = createSession(db, "k");
    strictEqual(getHistory(db, session.id).length, 0);
  });

  it("returns empty array for non-existent session", () => {
    strictEqual(getHistory(db, 99999).length, 0);
  });

  it("returns a single message", () => {
    const session = createSession(db, "k");
    addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const history = getHistory(db, session.id);
    strictEqual(history.length, 1);
    strictEqual(history[0]!.content, "hello");
  });

  it("returns a linear chain in chronological order", () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "first" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "second",
      parentId: m1.id,
    });
    addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "third",
      parentId: m2.id,
    });
    const history = getHistory(db, session.id);
    strictEqual(history.length, 3);
    strictEqual(history[0]!.content, "first");
    strictEqual(history[1]!.content, "second");
    strictEqual(history[2]!.content, "third");
  });

  it("stops at a compaction boundary (includes compaction, excludes earlier messages)", () => {
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
      content: "summary of conversation",
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
    const history = getHistory(db, session.id);
    strictEqual(history.length, 3);
    strictEqual(history[0]!.content, "summary of conversation");
    strictEqual(history[0]!.isCompaction, true);
    strictEqual(history[1]!.content, "new-1");
    strictEqual(history[2]!.content, "new-2");
  });

  it("stops at the most recent compaction when multiple exist", () => {
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
    const history = getHistory(db, session.id);
    strictEqual(history.length, 2);
    strictEqual(history[0]!.content, "second summary");
    strictEqual(history[1]!.content, "recent");
  });

  it("works when head is a compaction message", () => {
    const session = createSession(db, "k");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "old" });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "compacted",
      parentId: m1.id,
      isCompaction: true,
    });
    const history = getHistory(db, session.id);
    strictEqual(history.length, 1);
    strictEqual(history[0]!.content, "compacted");
    strictEqual(history[0]!.isCompaction, true);
  });
});
