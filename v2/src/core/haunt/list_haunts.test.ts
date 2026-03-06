import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { listHaunts } from "./list_haunts.ts";
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

describe("listHaunts", () => {
  it("returns empty array when no haunts exist", () => {
    deepStrictEqual(listHaunts(db), []);
  });

  it("returns summaries ordered by most recent first", () => {
    const s1 = createSession(db, "haunt:list:1", { purpose: "haunt" });
    const s2 = createSession(db, "haunt:list:2", { purpose: "haunt" });
    storeHaunt(db, { sessionId: s1.id as number, rawJournal: "old", summary: "first haunt" });
    storeHaunt(db, { sessionId: s2.id as number, rawJournal: "new", summary: "second haunt" });

    const results = listHaunts(db);
    strictEqual(results.length, 2);
    strictEqual(results[0].summary, "second haunt");
    strictEqual(results[1].summary, "first haunt");
  });

  it("respects the limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `haunt:list:lim:${i}`, { purpose: "haunt" });
      storeHaunt(db, { sessionId: s.id as number, rawJournal: `j${i}`, summary: `s${i}` });
    }

    strictEqual(listHaunts(db, 3).length, 3);
  });

  it("does not include raw_journal in results", () => {
    const s = createSession(db, "haunt:list:nojrnl", { purpose: "haunt" });
    storeHaunt(db, { sessionId: s.id as number, rawJournal: "secret thoughts", summary: "ok" });

    const results = listHaunts(db);
    strictEqual(results.length, 1);
    strictEqual("rawJournal" in results[0], false);
  });
});
