import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { getHowl } from "./get_howl.ts";
import { initHowlTables } from "./schema.ts";
import { storeHowl } from "./store_howl.ts";
import { updateHowlChannel, updateHowlStatus } from "./update_howl.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("updateHowlStatus", () => {
  it("marks a howl as responded with timestamp", () => {
    const s = createSession(db, "chat:1");
    const howl = storeHowl(db, {
      originSessionId: s.id as number,
      message: "test",
      urgency: "low",
    });

    updateHowlStatus(db, howl.id, "responded");

    const updated = getHowl(db, howl.id);
    ok(updated);
    strictEqual(updated.status, "responded");
    ok(updated.respondedAt !== null);
  });

  it("marks a howl as dismissed", () => {
    const s = createSession(db, "chat:2");
    const howl = storeHowl(db, {
      originSessionId: s.id as number,
      message: "test",
      urgency: "low",
    });

    updateHowlStatus(db, howl.id, "dismissed");

    const updated = getHowl(db, howl.id);
    ok(updated);
    strictEqual(updated.status, "dismissed");
  });
});

describe("updateHowlChannel", () => {
  it("sets the delivery channel", () => {
    const s = createSession(db, "chat:3");
    const howl = storeHowl(db, {
      originSessionId: s.id as number,
      message: "test",
      urgency: "low",
    });

    updateHowlChannel(db, howl.id, "telegram");

    const updated = getHowl(db, howl.id);
    ok(updated);
    strictEqual(updated.channel, "telegram");
  });
});
