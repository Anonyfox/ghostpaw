import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { getXPByQuest } from "./get_xp_by_quest.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getXPByQuest", () => {
  it("returns 0 for quest with no sessions", () => {
    strictEqual(getXPByQuest(db, 999), 0);
  });

  it("sums xp_earned from closed sessions linked to quest", () => {
    const s1 = createSession(db, "s1", { purpose: "quest", questId: 42 });
    const s2 = createSession(db, "s2", { purpose: "quest", questId: 42 });
    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);
    db.prepare(
      "UPDATE sessions SET tokens_in = 8000, tokens_out = 4000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s2.id);

    closeSession(db, s1.id as number);
    closeSession(db, s2.id as number);

    const total = getXPByQuest(db, 42);
    ok(total > 0, `expected total xp > 0, got ${total}`);
  });

  it("excludes open sessions", () => {
    const s1 = createSession(db, "closed", { purpose: "quest", questId: 7 });
    createSession(db, "open", { purpose: "quest", questId: 7 });

    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);

    closeSession(db, s1.id as number);

    const closedXP = getXPByQuest(db, 7);
    ok(closedXP > 0, "closed session contributes XP");
  });

  it("excludes sessions from other quests", () => {
    const s1 = createSession(db, "q1", { purpose: "quest", questId: 1 });
    const s2 = createSession(db, "q2", { purpose: "quest", questId: 2 });
    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s1.id);
    db.prepare(
      "UPDATE sessions SET tokens_in = 5000, tokens_out = 3000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, s2.id);

    closeSession(db, s1.id as number);
    closeSession(db, s2.id as number);

    const xpQ1 = getXPByQuest(db, 1);
    const xpQ2 = getXPByQuest(db, 2);
    ok(xpQ1 > 0);
    ok(xpQ2 > 0);
    strictEqual(xpQ1, xpQ2);
  });
});
