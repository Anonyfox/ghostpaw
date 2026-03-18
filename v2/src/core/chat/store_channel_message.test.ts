import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { initChatTables } from "./schema.ts";
import { storeChannelMessage } from "./store_channel_message.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("storeChannelMessage", () => {
  it("stores a mapping and returns the record", () => {
    const session = createSession(db, "tg:1");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hi" });

    const result = storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "telegram",
      channelMessageId: "42",
      direction: "in",
    });

    ok(result.id > 0);
    strictEqual(result.messageId, msg.id);
    strictEqual(result.channel, "telegram");
    strictEqual(result.channelMessageId, "42");
    strictEqual(result.direction, "in");
  });

  it("stores multiple mappings for the same internal message (split messages)", () => {
    const session = createSession(db, "tg:2");
    const msg = addMessage(db, { sessionId: session.id, role: "assistant", content: "long" });

    storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "telegram",
      channelMessageId: "100",
      direction: "out",
    });
    storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "telegram",
      channelMessageId: "101",
      direction: "out",
    });

    const rows = db
      .prepare("SELECT * FROM channel_messages WHERE message_id = ?")
      .all(msg.id) as Record<string, unknown>[];
    strictEqual(rows.length, 2);
  });

  it("handles email-style angle-bracket message IDs", () => {
    const session = createSession(db, "email:1");
    const msg = addMessage(db, { sessionId: session.id, role: "assistant", content: "reply" });

    const result = storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "email",
      channelMessageId: "<abc-123@ghostpaw>",
      direction: "out",
    });

    strictEqual(result.channelMessageId, "<abc-123@ghostpaw>");
  });
});
