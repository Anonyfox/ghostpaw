import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { lookupByChannelId, lookupByMessageId } from "./lookup_channel_message.ts";
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

describe("lookupByChannelId", () => {
  it("finds a stored channel message mapping", () => {
    const session = createSession(db, "tg:1");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hi" });
    storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "telegram",
      channelMessageId: "42",
      direction: "in",
    });

    const result = lookupByChannelId(db, "telegram", "42");
    strictEqual(result?.messageId, msg.id);
    strictEqual(result?.sessionId, session.id);
  });

  it("returns null for unknown channel message", () => {
    const result = lookupByChannelId(db, "telegram", "999");
    strictEqual(result, null);
  });

  it("distinguishes between channels", () => {
    const session = createSession(db, "tg:1");
    const msg = addMessage(db, { sessionId: session.id, role: "user", content: "hi" });
    storeChannelMessage(db, {
      sessionId: session.id,
      messageId: msg.id,
      channel: "telegram",
      channelMessageId: "42",
      direction: "in",
    });

    strictEqual(lookupByChannelId(db, "web", "42"), null);
    strictEqual(lookupByChannelId(db, "email", "42"), null);
  });
});

describe("lookupByMessageId", () => {
  it("finds all channel mappings for an internal message", () => {
    const session = createSession(db, "tg:1");
    const msg = addMessage(db, { sessionId: session.id, role: "assistant", content: "hi" });
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

    const results = lookupByMessageId(db, msg.id);
    strictEqual(results.length, 2);
    deepStrictEqual(results.map((r) => r.channelMessageId).sort(), ["100", "101"]);
  });

  it("returns empty array for unmapped message", () => {
    const results = lookupByMessageId(db, 9999);
    deepStrictEqual(results, []);
  });
});
