import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { countPendingHowls, getPendingHowl } from "./get_pending_howl.ts";
import { initHowlTables } from "./schema.ts";
import { storeHowl } from "./store_howl.ts";
import { updateHowlStatus } from "./update_howl.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHowlTables(db);
});

afterEach(() => {
  db.close();
});

describe("getPendingHowl", () => {
  it("returns null when no howls exist", () => {
    strictEqual(getPendingHowl(db), null);
  });

  it("returns the oldest pending howl", () => {
    const s1 = createSession(db, "howl:1", { purpose: "howl" });
    const s2 = createSession(db, "howl:2", { purpose: "howl" });
    storeHowl(db, { sessionId: s1.id as number, message: "first", urgency: "low" });
    storeHowl(db, { sessionId: s2.id as number, message: "second", urgency: "high" });

    const pending = getPendingHowl(db);
    ok(pending !== null);
    strictEqual(pending.message, "first");
  });

  it("skips responded and dismissed howls", () => {
    const s1 = createSession(db, "howl:1", { purpose: "howl" });
    const s2 = createSession(db, "howl:2", { purpose: "howl" });
    const h1 = storeHowl(db, { sessionId: s1.id as number, message: "old", urgency: "low" });
    storeHowl(db, { sessionId: s2.id as number, message: "new", urgency: "low" });
    updateHowlStatus(db, h1.id, "responded");

    const pending = getPendingHowl(db);
    ok(pending !== null);
    strictEqual(pending.message, "new");
  });

  it("returns null when all howls are resolved", () => {
    const s1 = createSession(db, "howl:1", { purpose: "howl" });
    const h1 = storeHowl(db, { sessionId: s1.id as number, message: "done", urgency: "low" });
    updateHowlStatus(db, h1.id, "dismissed");

    strictEqual(getPendingHowl(db), null);
  });
});

describe("countPendingHowls", () => {
  it("returns 0 when no howls exist", () => {
    strictEqual(countPendingHowls(db), 0);
  });

  it("counts only pending howls", () => {
    const s1 = createSession(db, "howl:1", { purpose: "howl" });
    const s2 = createSession(db, "howl:2", { purpose: "howl" });
    const s3 = createSession(db, "howl:3", { purpose: "howl" });
    const h1 = storeHowl(db, { sessionId: s1.id as number, message: "a", urgency: "low" });
    storeHowl(db, { sessionId: s2.id as number, message: "b", urgency: "low" });
    storeHowl(db, { sessionId: s3.id as number, message: "c", urgency: "low" });
    updateHowlStatus(db, h1.id, "responded");

    strictEqual(countPendingHowls(db), 2);
  });
});
