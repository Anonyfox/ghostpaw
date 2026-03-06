import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { countHowlsToday, lastHowlTime, listHowls } from "./list_howls.ts";
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

describe("listHowls", () => {
  it("returns howls ordered by creation time desc", () => {
    const s1 = createSession(db, "howl:1", { purpose: "howl" });
    const s2 = createSession(db, "howl:2", { purpose: "howl" });
    storeHowl(db, { sessionId: s1.id as number, message: "first", urgency: "low" });
    storeHowl(db, { sessionId: s2.id as number, message: "second", urgency: "high" });

    const results = listHowls(db);
    strictEqual(results.length, 2);
    strictEqual(results[0].message, "second");
    strictEqual(results[1].message, "first");
  });

  it("filters by status", () => {
    const s1 = createSession(db, "howl:3", { purpose: "howl" });
    const s2 = createSession(db, "howl:4", { purpose: "howl" });
    storeHowl(db, { sessionId: s1.id as number, message: "pending one", urgency: "low" });
    storeHowl(db, { sessionId: s2.id as number, message: "pending two", urgency: "low" });

    db.prepare("UPDATE howls SET status = 'responded' WHERE session_id = ?").run(s1.id);

    const pending = listHowls(db, { status: "pending" });
    strictEqual(pending.length, 1);
    strictEqual(pending[0].message, "pending two");
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `howl:lim:${i}`, { purpose: "howl" });
      storeHowl(db, { sessionId: s.id as number, message: `msg ${i}`, urgency: "low" });
    }
    const results = listHowls(db, { limit: 3 });
    strictEqual(results.length, 3);
  });
});

describe("countHowlsToday", () => {
  it("counts howls created today", () => {
    strictEqual(countHowlsToday(db), 0);
    const s = createSession(db, "howl:count", { purpose: "howl" });
    storeHowl(db, { sessionId: s.id as number, message: "today", urgency: "low" });
    strictEqual(countHowlsToday(db), 1);
  });
});

describe("lastHowlTime", () => {
  it("returns null when no howls exist", () => {
    strictEqual(lastHowlTime(db), null);
  });

  it("returns the most recent howl time", () => {
    const s = createSession(db, "howl:last", { purpose: "howl" });
    storeHowl(db, { sessionId: s.id as number, message: "latest", urgency: "low" });
    const time = lastHowlTime(db);
    ok(time !== null);
    ok(time > 0);
  });
});
