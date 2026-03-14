import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import { addMessage, createSession } from "../../api/write/index.ts";
import { initChatTables, initHowlTables } from "../../runtime/index.ts";
import { storeHowl } from "./store_howl.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("storeHowl", () => {
  it("stores and returns a howl with correct fields", () => {
    const session = createSession(db, "chat:1");
    const howlSession = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: howlSession.id as number,
      originSessionId: session.id as number,
      message: "Is this MCP server config still valid?",
      urgency: "low",
    });

    ok(howl.id > 0);
    strictEqual(howl.sessionId, howlSession.id);
    strictEqual(howl.originSessionId, session.id);
    strictEqual(howl.originMessageId, null);
    strictEqual(howl.message, "Is this MCP server config still valid?");
    strictEqual(howl.urgency, "low");
    strictEqual(howl.status, "pending");
    strictEqual(howl.channel, null);
    strictEqual(howl.respondedAt, null);
    ok(howl.createdAt > 0);
  });

  it("stores with channel, high urgency, and origin message id", () => {
    const session = createSession(db, "chat:2");
    const howlSession = createSession(db, "howl:2", { purpose: "howl" });
    const msg = addMessage(db, {
      sessionId: session.id as number,
      role: "user",
      content: "some context",
    });
    const howl = storeHowl(db, {
      sessionId: howlSession.id as number,
      originSessionId: session.id as number,
      originMessageId: msg.id as number,
      message: "Found a critical issue",
      urgency: "high",
      channel: "telegram",
    });

    strictEqual(howl.urgency, "high");
    strictEqual(howl.channel, "telegram");
    strictEqual(howl.originMessageId, msg.id);
  });

  it("allows multiple howls from the same origin session", () => {
    const session = createSession(db, "chat:3");
    const howlSession1 = createSession(db, "howl:3:1", { purpose: "howl" });
    const howlSession2 = createSession(db, "howl:3:2", { purpose: "howl" });
    const h1 = storeHowl(db, {
      sessionId: howlSession1.id as number,
      originSessionId: session.id as number,
      message: "first",
      urgency: "low",
    });
    const h2 = storeHowl(db, {
      sessionId: howlSession2.id as number,
      originSessionId: session.id as number,
      message: "second",
      urgency: "low",
    });

    ok(h1.id !== h2.id);
    strictEqual(h1.originSessionId, h2.originSessionId);
  });
});
