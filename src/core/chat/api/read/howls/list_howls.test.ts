import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { openTestDatabase } from "../../../../../lib/index.ts";
import { storeHowl, updateHowlStatus } from "../../../internal/howls/index.ts";
import { initChatTables, initHowlTables } from "../../../runtime/index.ts";
import { createSession } from "../../write/index.ts";
import { countHowlsToday, lastHowlTime, listHowls } from "./list_howls.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("listHowls", () => {
  it("returns howls ordered by creation time desc", () => {
    const s = createSession(db, "chat:1");
    storeHowl(db, {
      sessionId: createSession(db, "howl:1:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "first",
      urgency: "low",
    });
    storeHowl(db, {
      sessionId: createSession(db, "howl:1:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "second",
      urgency: "high",
    });

    const results = listHowls(db);
    strictEqual(results.length, 2);
    strictEqual(results[0].message, "second");
    strictEqual(results[1].message, "first");
  });

  it("filters by status", () => {
    const s = createSession(db, "chat:2");
    const h1 = storeHowl(db, {
      sessionId: createSession(db, "howl:2:1", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "pending one",
      urgency: "low",
    });
    storeHowl(db, {
      sessionId: createSession(db, "howl:2:2", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "pending two",
      urgency: "low",
    });
    updateHowlStatus(db, h1.id, "responded");

    const pending = listHowls(db, { status: "pending" });
    strictEqual(pending.length, 1);
    strictEqual(pending[0].message, "pending two");
  });

  it("respects limit", () => {
    const s = createSession(db, "chat:3");
    for (let i = 0; i < 5; i++) {
      storeHowl(db, {
        sessionId: createSession(db, `howl:3:${i}`, { purpose: "howl" }).id as number,
        originSessionId: s.id as number,
        message: `msg ${i}`,
        urgency: "low",
      });
    }
    const results = listHowls(db, { limit: 3 });
    strictEqual(results.length, 3);
  });
});

describe("countHowlsToday", () => {
  it("counts howls created today", () => {
    strictEqual(countHowlsToday(db), 0);
    const s = createSession(db, "chat:4");
    storeHowl(db, {
      sessionId: createSession(db, "howl:4", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "today",
      urgency: "low",
    });
    strictEqual(countHowlsToday(db), 1);
  });
});

describe("lastHowlTime", () => {
  it("returns null when no howls exist", () => {
    strictEqual(lastHowlTime(db), null);
  });

  it("returns the most recent howl time", () => {
    const s = createSession(db, "chat:5");
    storeHowl(db, {
      sessionId: createSession(db, "howl:5", { purpose: "howl" }).id as number,
      originSessionId: s.id as number,
      message: "latest",
      urgency: "low",
    });
    const time = lastHowlTime(db);
    ok(time !== null);
    ok(time > 0);
  });
});
