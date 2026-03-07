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
  it("creates a session with correct defaults and persists it", () => {
    const before = Date.now();
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
    strictEqual(session.distilledAt, null);
    strictEqual(session.parentSessionId, null);
    strictEqual(session.soulId, null);
    strictEqual(session.error, null);
    ok(session.createdAt >= before);
    strictEqual(session.createdAt, session.lastActiveAt);
    const row = db.prepare("SELECT key FROM sessions WHERE id = ?").get(session.id);
    strictEqual(row!.key, "test-key");
  });

  it("accepts purpose, model, parentSessionId, and soulId options", () => {
    const parent = createSession(db, "parent");
    const child = createSession(db, "child", {
      purpose: "delegate",
      model: "gpt-4o",
      parentSessionId: parent.id as number,
      soulId: 3,
    });
    strictEqual(child.purpose, "delegate");
    strictEqual(child.model, "gpt-4o");
    strictEqual(child.parentSessionId, parent.id);
    strictEqual(child.soulId, 3);
  });

  it("assigns unique incrementing ids", () => {
    const s1 = createSession(db, "k");
    const s2 = createSession(db, "k");
    ok(s2.id > s1.id);
    strictEqual(s1.key, s2.key);
  });

  it("accepts all valid purpose values", () => {
    for (const purpose of ["chat", "delegate", "train", "scout", "system"] as const) {
      strictEqual(createSession(db, `k-${purpose}`, { purpose }).purpose, purpose);
    }
  });
});
