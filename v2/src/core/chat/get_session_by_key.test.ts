import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSessionByKey } from "./get_session_by_key.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getSessionByKey", () => {
  it("returns the session matching the key", () => {
    createSession(db, "my-key");
    const found = getSessionByKey(db, "my-key");
    ok(found);
    strictEqual(found.key, "my-key");
  });

  it("returns null when no session matches", () => {
    strictEqual(getSessionByKey(db, "nonexistent"), null);
  });

  it("returns the most recently active session when multiple exist", () => {
    const s1 = createSession(db, "dup");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(1000, s1.id);
    const s2 = createSession(db, "dup");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(2000, s2.id);
    const found = getSessionByKey(db, "dup");
    ok(found);
    strictEqual(found.id, s2.id);
  });

  it("skips closed sessions", () => {
    const s1 = createSession(db, "k");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s1.id);
    strictEqual(getSessionByKey(db, "k"), null);
  });

  it("returns open session even when a closed one exists with the same key", () => {
    const closed = createSession(db, "k");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), closed.id);
    const open = createSession(db, "k");
    const found = getSessionByKey(db, "k");
    ok(found);
    strictEqual(found.id, open.id);
  });

  it("does not skip absorbed sessions (absorbed but not closed is still active)", () => {
    const session = createSession(db, "k");
    db.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ?").run(Date.now(), session.id);
    const found = getSessionByKey(db, "k");
    ok(found);
    strictEqual(found.id, session.id);
  });
});
