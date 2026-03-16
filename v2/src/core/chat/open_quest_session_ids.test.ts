import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { openQuestSessionIds } from "./open_quest_session_ids.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

describe("openQuestSessionIds", () => {
  it("returns empty set when no quest sessions", () => {
    createSession(db, "plain");
    strictEqual(openQuestSessionIds(db).size, 0);
  });

  it("returns quest IDs with open sessions", () => {
    createSession(db, "q1", { purpose: "quest", questId: 42 });
    createSession(db, "q2", { purpose: "quest", questId: 77 });
    const ids = openQuestSessionIds(db);
    strictEqual(ids.size, 2);
    ok(ids.has(42));
    ok(ids.has(77));
  });

  it("excludes closed sessions", () => {
    const s = createSession(db, "q3", { purpose: "quest", questId: 10 });
    closeSession(db, s.id as number);
    strictEqual(openQuestSessionIds(db).size, 0);
  });

  it("deduplicates quest IDs", () => {
    createSession(db, "qa", { purpose: "quest", questId: 5 });
    createSession(db, "qb", { purpose: "quest", questId: 5 });
    strictEqual(openQuestSessionIds(db).size, 1);
  });
});
