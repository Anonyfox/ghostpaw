import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initHauntTables } from "./schema.ts";
import { storeHaunt } from "./store_haunt.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initHauntTables(db);
});

afterEach(() => {
  db.close();
});

describe("storeHaunt", () => {
  it("stores and returns a haunt with correct fields", () => {
    const session = createSession(db, "haunt:1", { purpose: "haunt" });
    const haunt = storeHaunt(db, {
      sessionId: session.id as number,
      rawJournal: "I thought about the workspace layout.",
      summary: "Explored workspace structure.",
    });

    ok(haunt.id > 0);
    strictEqual(haunt.sessionId, session.id);
    strictEqual(haunt.rawJournal, "I thought about the workspace layout.");
    strictEqual(haunt.summary, "Explored workspace structure.");
    ok(haunt.createdAt > 0);
  });

  it("persists to the database", () => {
    const session = createSession(db, "haunt:2", { purpose: "haunt" });
    const haunt = storeHaunt(db, {
      sessionId: session.id as number,
      rawJournal: "journal text",
      summary: "summary text",
    });

    const row = db.prepare("SELECT * FROM haunts WHERE id = ?").get(haunt.id) as Record<
      string,
      unknown
    >;
    strictEqual(row.raw_journal, "journal text");
    strictEqual(row.summary, "summary text");
  });

  it("enforces unique session_id constraint", () => {
    const session = createSession(db, "haunt:3", { purpose: "haunt" });
    storeHaunt(db, {
      sessionId: session.id as number,
      rawJournal: "first",
      summary: "first",
    });

    throws(() => {
      storeHaunt(db, {
        sessionId: session.id as number,
        rawJournal: "second",
        summary: "second",
      });
    });
  });

  it("assigns unique ids to successive haunts", () => {
    const s1 = createSession(db, "haunt:4a", { purpose: "haunt" });
    const s2 = createSession(db, "haunt:4b", { purpose: "haunt" });
    const h1 = storeHaunt(db, { sessionId: s1.id as number, rawJournal: "a", summary: "a" });
    const h2 = storeHaunt(db, { sessionId: s2.id as number, rawJournal: "b", summary: "b" });
    ok(h2.id > h1.id);
  });
});
