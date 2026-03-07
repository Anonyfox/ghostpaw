import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getOrCreateSession } from "./get_or_create_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getOrCreateSession", () => {
  it("creates when none exists, returns existing on repeat", () => {
    const s1 = getOrCreateSession(db, "k", { purpose: "delegate", model: "gpt-4o" });
    ok(s1.id > 0);
    strictEqual(s1.purpose, "delegate");
    const s2 = getOrCreateSession(db, "k");
    strictEqual(s2.id, s1.id);
  });

  it("creates a new session when the existing one is closed", () => {
    const closed = createSession(db, "k");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), closed.id);
    const fresh = getOrCreateSession(db, "k");
    ok(fresh.id !== closed.id);
  });

  it("ignores options when returning an existing session", () => {
    createSession(db, "k", { purpose: "chat" });
    const found = getOrCreateSession(db, "k", { purpose: "delegate" });
    strictEqual(found.purpose, "chat");
  });
});
