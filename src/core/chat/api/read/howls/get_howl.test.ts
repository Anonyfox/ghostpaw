import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { openTestDatabase } from "../../../../../lib/index.ts";
import { storeHowl } from "../../../internal/howls/index.ts";
import { initChatTables, initHowlTables } from "../../../runtime/index.ts";
import { createSession } from "../../write/index.ts";
import { getHowl } from "./get_howl.ts";

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
    const howlSession = createSession(db, "howl:1", { purpose: "howl" });
    const stored = storeHowl(db, {
      sessionId: howlSession.id as number,
      originSessionId: session.id as number,
      message: "test message",
      urgency: "low",
    });

    const found = getHowl(db, stored.id);
    ok(found);
    strictEqual(found.message, "test message");
    strictEqual(found.status, "pending");
    strictEqual(found.sessionId, howlSession.id);
    strictEqual(found.originSessionId, session.id);
    strictEqual(found.originMessageId, null);
  });

  it("returns null for non-existent id", () => {
    strictEqual(getHowl(db, 999), null);
  });
});
