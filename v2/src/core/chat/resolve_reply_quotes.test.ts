import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { resolveReplyQuotes } from "./resolve_reply_quotes.ts";
import { initChatTables } from "./schema.ts";
import type { ChatMessage } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("resolveReplyQuotes", () => {
  it("returns history unchanged when no replyToId references", () => {
    const session = createSession(db, "test");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi there",
      parentId: m1.id,
    });

    const history = [m1, m2];
    const result = resolveReplyQuotes(db, history);
    strictEqual(result.length, 2);
    strictEqual(result[0].content, "hello");
    strictEqual(result[1].content, "hi there");
  });

  it("does not inject quote when referenced message is already in history", () => {
    const session = createSession(db, "test");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "about hello",
      parentId: m1.id,
      replyToId: m1.id,
    });

    const history = [m1, m2];
    const result = resolveReplyQuotes(db, history);
    strictEqual(result.length, 2);
    strictEqual(result[1].content, "about hello");
  });

  it("injects quote prefix when referenced message is NOT in history", () => {
    const session = createSession(db, "test");
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: "original message" });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "reply",
      parentId: m1.id,
    });
    const m3 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "about the original",
      parentId: m2.id,
      replyToId: m1.id,
    });

    // history only includes m2 and m3 (m1 was compacted away)
    const history = [m2, m3];
    const result = resolveReplyQuotes(db, history);
    strictEqual(result.length, 2);
    strictEqual(result[0].content, "reply");
    strictEqual(result[1].content, '[Replying to: "original message"]\nabout the original');
  });

  it("truncates long quoted content", () => {
    const session = createSession(db, "test");
    const longContent = "x".repeat(300);
    const m1 = addMessage(db, { sessionId: session.id, role: "user", content: longContent });
    const m2 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "referring back",
      parentId: m1.id,
      replyToId: m1.id,
    });

    // m1 not in history
    const history: ChatMessage[] = [m2];
    const result = resolveReplyQuotes(db, history);
    strictEqual(result.length, 1);
    const quoted = result[0].content;
    strictEqual(quoted.includes("..."), true);
    strictEqual(quoted.length < longContent.length, true);
  });

  it("handles reply to deleted/missing message gracefully", () => {
    const session = createSession(db, "test");
    const m1 = addMessage(db, {
      sessionId: session.id,
      role: "user",
      content: "reply to gone",
    });
    // Manually set reply_to_id to a nonexistent message (bypass FK at test level)
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec(`UPDATE messages SET reply_to_id = 99999 WHERE id = ${m1.id}`);
    db.exec("PRAGMA foreign_keys = ON");
    m1.replyToId = 99999;

    const history: ChatMessage[] = [m1];
    const result = resolveReplyQuotes(db, history);
    strictEqual(result.length, 1);
    strictEqual(result[0].content, "reply to gone");
  });
});
