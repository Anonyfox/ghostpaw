import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { getHowl } from "./get_howl.ts";
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
    const session = createSession(db, "chat:1");
    const stored = storeHowl(db, {
      originSessionId: session.id as number,
      message: "test message",
      urgency: "low",
    });

    const found = getHowl(db, stored.id);
    ok(found);
    strictEqual(found.message, "test message");
    strictEqual(found.status, "pending");
    strictEqual(found.originSessionId, session.id);
    strictEqual(found.originMessageId, null);
  });

  it("returns null for non-existent id", () => {
    strictEqual(getHowl(db, 999), null);
  });
});
