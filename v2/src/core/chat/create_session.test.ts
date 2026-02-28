import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("createSession", () => {
  it("creates a session with default values", () => {
    const session = createSession(db, "test-key");
    ok(session.id > 0);
    strictEqual(session.key, "test-key");
    strictEqual(session.purpose, "chat");
    strictEqual(session.model, null);
    strictEqual(session.tokensIn, 0);
    strictEqual(session.tokensOut, 0);
    strictEqual(session.costUsd, 0);
    strictEqual(session.headMessageId, null);
    strictEqual(session.closedAt, null);
    strictEqual(session.absorbedAt, null);
  });

  it("accepts a custom purpose", () => {
    const session = createSession(db, "delegate-key", { purpose: "delegate" });
    strictEqual(session.purpose, "delegate");
  });

  it("accepts a model override", () => {
    const session = createSession(db, "k", { model: "gpt-4o" });
    strictEqual(session.model, "gpt-4o");
  });

  it("sets created_at and last_active_at to the current timestamp", () => {
    const before = Date.now();
    const session = createSession(db, "k");
    const after = Date.now();
    ok(session.createdAt >= before && session.createdAt <= after);
    strictEqual(session.createdAt, session.lastActiveAt);
  });

  it("assigns unique ids to successive sessions", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    ok(s1.id !== s2.id);
    ok(s2.id > s1.id);
  });

  it("allows multiple sessions with the same key", () => {
    const s1 = createSession(db, "shared-key");
    const s2 = createSession(db, "shared-key");
    ok(s1.id !== s2.id);
    strictEqual(s1.key, s2.key);
  });

  it("persists the session to the database", () => {
    const session = createSession(db, "persist-test");
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
    ok(row);
    strictEqual(row.key, "persist-test");
    strictEqual(row.purpose, "chat");
  });

  it("accepts all valid purpose values", () => {
    const purposes = ["chat", "delegate", "train", "scout", "refine", "system"] as const;
    for (const purpose of purposes) {
      const session = createSession(db, `key-${purpose}`, { purpose });
      strictEqual(session.purpose, purpose);
    }
  });
});
