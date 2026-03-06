import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initHowlTables } from "./schema.ts";
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
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "Is this MCP server config still valid?",
      urgency: "low",
    });

    ok(howl.id > 0);
    strictEqual(howl.sessionId, session.id);
    strictEqual(howl.message, "Is this MCP server config still valid?");
    strictEqual(howl.urgency, "low");
    strictEqual(howl.status, "pending");
    strictEqual(howl.channel, null);
    strictEqual(howl.respondedAt, null);
    ok(howl.createdAt > 0);
  });

  it("stores with channel and high urgency", () => {
    const session = createSession(db, "howl:2", { purpose: "howl" });
    const howl = storeHowl(db, {
      sessionId: session.id as number,
      message: "Found a critical issue",
      urgency: "high",
      channel: "telegram",
    });

    strictEqual(howl.urgency, "high");
    strictEqual(howl.channel, "telegram");
  });

  it("enforces unique session_id constraint", () => {
    const session = createSession(db, "howl:3", { purpose: "howl" });
    storeHowl(db, {
      sessionId: session.id as number,
      message: "first",
      urgency: "low",
    });

    throws(() => {
      storeHowl(db, {
        sessionId: session.id as number,
        message: "second",
        urgency: "low",
      });
    });
  });
});
