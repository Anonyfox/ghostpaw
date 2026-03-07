import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getSession", () => {
  it("returns a session by id with all fields mapped", () => {
    const created = createSession(db, "k");
    db.prepare(
      "UPDATE sessions SET tokens_in = 100, tokens_out = 50, cost_usd = 0.01 WHERE id = ?",
    ).run(created.id);
    const found = getSession(db, created.id);
    ok(found);
    strictEqual(found.id, created.id);
    strictEqual(found.key, "k");
    strictEqual(found.tokensIn, 100);
    strictEqual(found.costUsd, 0.01);
  });

  it("returns null for a non-existent id", () => {
    strictEqual(getSession(db, 99999), null);
  });

  it("returns session regardless of closed or distilled state", () => {
    const s1 = createSession(db, "a");
    const s2 = createSession(db, "b");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s1.id);
    db.prepare("UPDATE sessions SET distilled_at = ? WHERE id = ?").run(Date.now(), s2.id);
    ok(getSession(db, s1.id));
    ok(getSession(db, s2.id));
  });
});
