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
  it("creates a new session when none exists", () => {
    const session = getOrCreateSession(db, "new-key");
    ok(session.id > 0);
    strictEqual(session.key, "new-key");
    strictEqual(session.purpose, "chat");
  });

  it("returns the existing active session when one exists", () => {
    const original = createSession(db, "sticky");
    const found = getOrCreateSession(db, "sticky");
    strictEqual(found.id, original.id);
  });

  it("creates a new session when the existing one is closed", () => {
    const closed = createSession(db, "k");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), closed.id);
    const fresh = getOrCreateSession(db, "k");
    ok(fresh.id !== closed.id);
    strictEqual(fresh.key, "k");
  });

  it("passes options through to the new session", () => {
    const session = getOrCreateSession(db, "k", { purpose: "delegate", model: "gpt-4o" });
    strictEqual(session.purpose, "delegate");
    strictEqual(session.model, "gpt-4o");
  });

  it("ignores options when returning an existing session", () => {
    createSession(db, "k", { purpose: "chat" });
    const found = getOrCreateSession(db, "k", { purpose: "delegate", model: "gpt-4o" });
    strictEqual(found.purpose, "chat");
    strictEqual(found.model, null);
  });

  it("is idempotent — multiple calls return the same session", () => {
    const s1 = getOrCreateSession(db, "k");
    const s2 = getOrCreateSession(db, "k");
    strictEqual(s1.id, s2.id);
  });
});
