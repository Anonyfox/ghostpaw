import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { getHaunt } from "./get_haunt.ts";
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

describe("getHaunt", () => {
  it("returns a stored haunt by id", () => {
    const session = createSession(db, "haunt:get:1", { purpose: "haunt" });
    const stored = storeHaunt(db, {
      sessionId: session.id as number,
      rawJournal: "full journal content",
      summary: "brief summary",
    });

    const retrieved = getHaunt(db, stored.id);
    strictEqual(retrieved?.id, stored.id);
    strictEqual(retrieved?.rawJournal, "full journal content");
    strictEqual(retrieved?.summary, "brief summary");
    strictEqual(retrieved?.sessionId, session.id);
  });

  it("returns null for nonexistent id", () => {
    strictEqual(getHaunt(db, 999), null);
  });
});
