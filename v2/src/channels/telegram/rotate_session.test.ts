import { notStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getHistory, getSession, getSessionByKey } from "../../core/chat/api/read/index.ts";
import { addMessage, createSession } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { rotateSession } from "./rotate_session.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("rotateSession", () => {
  it("closes the old session and creates a new one with the same key", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });
    addMessage(db, { sessionId: old.id, role: "user", content: "hello" });

    const newId = rotateSession(db, old.id, key);

    const oldSession = getSession(db, old.id);
    ok(oldSession?.closedAt, "old session should be closed");

    const newSession = getSession(db, newId);
    ok(newSession, "new session should exist");
    strictEqual(newSession!.closedAt, null);
    strictEqual(newSession!.key, key);
    notStrictEqual(newId, old.id);
  });

  it("bridges the compaction summary into the new session", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });

    addMessage(db, {
      sessionId: old.id,
      role: "assistant",
      content: "Summary of prior conversation: user likes wolves.",
      isCompaction: true,
    });
    addMessage(db, {
      sessionId: old.id,
      role: "user",
      content: "tell me more",
      parentId: getSession(db, old.id)!.headMessageId!,
    });

    const newId = rotateSession(db, old.id, key);
    const history = getHistory(db, newId);

    strictEqual(history.length, 1);
    strictEqual(history[0]!.role, "assistant");
    ok(history[0]!.isCompaction);
    ok(history[0]!.content.includes("wolves"));
  });

  it("starts clean when old session has no compaction summary", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });
    addMessage(db, { sessionId: old.id, role: "user", content: "hello" });
    addMessage(db, {
      sessionId: old.id,
      role: "assistant",
      content: "hi",
      parentId: getSession(db, old.id)!.headMessageId!,
    });

    const newId = rotateSession(db, old.id, key);
    const history = getHistory(db, newId);

    strictEqual(history.length, 0);
  });

  it("starts clean when old session has no history at all", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });

    const newId = rotateSession(db, old.id, key);
    const history = getHistory(db, newId);

    strictEqual(history.length, 0);
  });

  it("preserves the chat purpose on the new session", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });

    const newId = rotateSession(db, old.id, key);
    const newSession = getSession(db, newId);

    strictEqual(newSession!.purpose, "chat");
  });

  it("new session is findable via getSessionByKey after rotation", () => {
    const key = "telegram:42";
    const old = createSession(db, key, { purpose: "chat" });

    const newId = rotateSession(db, old.id, key);
    const found = getSessionByKey(db, key);

    ok(found, "getSessionByKey should find the new open session");
    strictEqual(found!.id, newId);
  });

  it("can rotate multiple times in succession", () => {
    const key = "telegram:42";
    const first = createSession(db, key, { purpose: "chat" });

    addMessage(db, {
      sessionId: first.id,
      role: "assistant",
      content: "summary round 1",
      isCompaction: true,
    });

    const secondId = rotateSession(db, first.id, key);

    addMessage(db, {
      sessionId: secondId,
      role: "assistant",
      content: "summary round 2",
      isCompaction: true,
    });
    addMessage(db, {
      sessionId: secondId,
      role: "user",
      content: "more chat",
      parentId: getSession(db, secondId)!.headMessageId!,
    });

    const thirdId = rotateSession(db, secondId, key);

    ok(getSession(db, first.id)?.closedAt, "first session closed");
    ok(getSession(db, secondId)?.closedAt, "second session closed");
    strictEqual(getSession(db, thirdId)!.closedAt, null);

    const history = getHistory(db, thirdId);
    strictEqual(history.length, 1);
    ok(history[0]!.content.includes("round 2"));
  });
});
