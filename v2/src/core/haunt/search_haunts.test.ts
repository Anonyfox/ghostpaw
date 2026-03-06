import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initHauntTables } from "./schema.ts";
import { searchHaunts } from "./search_haunts.ts";
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

describe("searchHaunts", () => {
  it("returns empty array when nothing matches", () => {
    deepStrictEqual(searchHaunts(db, "nonexistent"), []);
  });

  it("finds haunts by keyword in summary", () => {
    const s1 = createSession(db, "haunt:search:1", { purpose: "haunt" });
    const s2 = createSession(db, "haunt:search:2", { purpose: "haunt" });
    storeHaunt(db, {
      sessionId: s1.id as number,
      rawJournal: "j1",
      summary: "Explored the deployment pipeline",
    });
    storeHaunt(db, {
      sessionId: s2.id as number,
      rawJournal: "j2",
      summary: "Researched memory architecture",
    });

    const results = searchHaunts(db, "deployment");
    strictEqual(results.length, 1);
    strictEqual(results[0].summary, "Explored the deployment pipeline");
  });

  it("is case-insensitive", () => {
    const s = createSession(db, "haunt:search:ci", { purpose: "haunt" });
    storeHaunt(db, { sessionId: s.id as number, rawJournal: "j", summary: "TypeScript patterns" });

    strictEqual(searchHaunts(db, "typescript").length, 1);
    strictEqual(searchHaunts(db, "TYPESCRIPT").length, 1);
  });

  it("respects the limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `haunt:search:lim:${i}`, { purpose: "haunt" });
      storeHaunt(db, {
        sessionId: s.id as number,
        rawJournal: `j${i}`,
        summary: `pattern analysis ${i}`,
      });
    }

    strictEqual(searchHaunts(db, "pattern", 2).length, 2);
  });

  it("matches partial words", () => {
    const s = createSession(db, "haunt:search:partial", { purpose: "haunt" });
    storeHaunt(db, { sessionId: s.id as number, rawJournal: "j", summary: "investigating bugs" });

    strictEqual(searchHaunts(db, "invest").length, 1);
  });
});
