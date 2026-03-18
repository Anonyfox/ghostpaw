import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { deleteLastExchange } from "./delete_last_exchange.ts";
import { initChatTables } from "./index.ts";

let db: DatabaseHandle;
let sessionId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  const session = createSession(db, "test:slash", { purpose: "chat" });
  sessionId = session.id as number;
});

afterEach(() => {
  db.close();
});

describe("deleteLastExchange", () => {
  it("removes the last user+assistant pair", () => {
    addMessage(db, { sessionId, role: "user", content: "hello" });
    addMessage(db, { sessionId, role: "assistant", content: "hi there" });

    const result = deleteLastExchange(db, sessionId);

    strictEqual(result.removedCount, 2);
    strictEqual(result.removedMessageIds.length, 2);

    const remaining = db
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE session_id = ?")
      .get(sessionId) as { c: number };
    strictEqual(remaining.c, 0);
  });

  it("returns zero when session has no messages", () => {
    const result = deleteLastExchange(db, sessionId);
    strictEqual(result.removedCount, 0);
    deepStrictEqual(result.removedMessageIds, []);
  });

  it("returns zero when session has only user messages (no assistant yet)", () => {
    addMessage(db, { sessionId, role: "user", content: "hello" });

    const result = deleteLastExchange(db, sessionId);
    strictEqual(result.removedCount, 0);
    deepStrictEqual(result.removedMessageIds, []);

    const remaining = db
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE session_id = ?")
      .get(sessionId) as { c: number };
    strictEqual(remaining.c, 1);
  });

  it("also removes tool_call and tool_result messages between user and assistant", () => {
    const user = addMessage(db, { sessionId, role: "user", content: "search for cats" });
    addMessage(db, {
      sessionId,
      role: "tool_call",
      content: "web_search",
      parentId: user.id as number,
    });
    addMessage(db, {
      sessionId,
      role: "tool_result",
      content: '{"results":[]}',
      parentId: user.id as number,
    });
    addMessage(db, { sessionId, role: "assistant", content: "I found cats" });

    const result = deleteLastExchange(db, sessionId);

    strictEqual(result.removedCount, 4);
    strictEqual(result.removedMessageIds.length, 4);

    const remaining = db
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE session_id = ?")
      .get(sessionId) as { c: number };
    strictEqual(remaining.c, 0);
  });

  it("only removes the last exchange, leaving earlier ones intact", () => {
    addMessage(db, { sessionId, role: "user", content: "first" });
    addMessage(db, { sessionId, role: "assistant", content: "first reply" });
    addMessage(db, { sessionId, role: "user", content: "second" });
    addMessage(db, { sessionId, role: "assistant", content: "second reply" });

    const result = deleteLastExchange(db, sessionId);

    strictEqual(result.removedCount, 2);

    const remaining = db
      .prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id")
      .all(sessionId) as { role: string; content: string }[];
    strictEqual(remaining.length, 2);
    strictEqual(remaining[0]!.content, "first");
    strictEqual(remaining[1]!.content, "first reply");
  });

  it("cascades deletion to channel_messages", () => {
    db.exec("PRAGMA foreign_keys = ON");
    const user = addMessage(db, { sessionId, role: "user", content: "hello" });
    const assistant = addMessage(db, { sessionId, role: "assistant", content: "hi" });

    db.prepare(
      "INSERT INTO channel_messages (session_id, message_id, channel, channel_message_id, direction, created_at) VALUES (?, ?, 'telegram', '100', 'in', ?)",
    ).run(sessionId, user.id, Date.now());
    db.prepare(
      "INSERT INTO channel_messages (session_id, message_id, channel, channel_message_id, direction, created_at) VALUES (?, ?, 'telegram', '101', 'out', ?)",
    ).run(sessionId, assistant.id, Date.now());

    deleteLastExchange(db, sessionId);

    const channelRows = db
      .prepare("SELECT COUNT(*) AS c FROM channel_messages WHERE session_id = ?")
      .get(sessionId) as { c: number };
    strictEqual(channelRows.c, 0);
  });
});
