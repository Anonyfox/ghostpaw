import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { getHowl, getHowlBySessionId } from "./get_howl.ts";
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

describe("getHowl", () => {
  it("returns a howl by id", () => {
    const session = createSession(db, "howl:1", { purpose: "howl" });
    const stored = storeHowl(db, {
      sessionId: session.id as number,
      message: "test message",
      urgency: "low",
    });

    const found = getHowl(db, stored.id);
    ok(found);
    strictEqual(found.message, "test message");
    strictEqual(found.status, "pending");
  });

  it("returns null for non-existent id", () => {
    strictEqual(getHowl(db, 999), null);
  });
});

describe("getHowlBySessionId", () => {
  it("returns a howl by session id", () => {
    const session = createSession(db, "howl:2", { purpose: "howl" });
    storeHowl(db, {
      sessionId: session.id as number,
      message: "by session",
      urgency: "high",
    });

    const found = getHowlBySessionId(db, session.id as number);
    ok(found);
    strictEqual(found.message, "by session");
  });

  it("returns null for non-existent session id", () => {
    strictEqual(getHowlBySessionId(db, 999), null);
  });
});
