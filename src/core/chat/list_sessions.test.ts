import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { listSessions } from "./list_sessions.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("listSessions", () => {
  it("returns an empty array when no sessions exist", () => {
    strictEqual(listSessions(db).length, 0);
  });

  it("returns all sessions ordered by last_active_at descending", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(1000, s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(3000, s2.id);
    const s3 = createSession(db, "k3");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(2000, s3.id);

    const list = listSessions(db);
    strictEqual(list.length, 3);
    strictEqual(list[0]!.id, s2.id);
    strictEqual(list[1]!.id, s3.id);
    strictEqual(list[2]!.id, s1.id);
  });

  it("filters by purpose", () => {
    createSession(db, "k1", { purpose: "chat" });
    createSession(db, "k2", { purpose: "delegate" });
    createSession(db, "k3", { purpose: "chat" });

    const chats = listSessions(db, { purpose: "chat" });
    strictEqual(chats.length, 2);
    ok(chats.every((s) => s.purpose === "chat"));

    const delegates = listSessions(db, { purpose: "delegate" });
    strictEqual(delegates.length, 1);
  });

  it("filters by open status", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s2.id);

    const openOnly = listSessions(db, { open: true });
    strictEqual(openOnly.length, 1);
    strictEqual(openOnly[0]!.id, s1.id);

    const closedOnly = listSessions(db, { open: false });
    strictEqual(closedOnly.length, 1);
    strictEqual(closedOnly[0]!.id, s2.id);
  });

  it("filters by distilled status", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET distilled_at = ? WHERE id = ?").run(Date.now(), s2.id);

    const notDistilled = listSessions(db, { distilled: false });
    strictEqual(notDistilled.length, 1);
    strictEqual(notDistilled[0]!.id, s1.id);

    const distilled = listSessions(db, { distilled: true });
    strictEqual(distilled.length, 1);
    strictEqual(distilled[0]!.id, s2.id);
  });

  it("combines multiple filters", () => {
    createSession(db, "k1", { purpose: "chat" });
    const s2 = createSession(db, "k2", { purpose: "delegate" });
    const s3 = createSession(db, "k3", { purpose: "chat" });
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s3.id);

    const openChats = listSessions(db, { purpose: "chat", open: true });
    strictEqual(openChats.length, 1);
    ok(openChats[0]!.closedAt === null);

    const openDelegates = listSessions(db, { purpose: "delegate", open: true });
    strictEqual(openDelegates.length, 1);
    strictEqual(openDelegates[0]!.id, s2.id);
  });

  it("filters by parentSessionId", () => {
    const parent = createSession(db, "parent");
    createSession(db, "child1", { parentSessionId: parent.id as number });
    createSession(db, "child2", { parentSessionId: parent.id as number });
    createSession(db, "orphan");

    const children = listSessions(db, { parentSessionId: parent.id as number });
    strictEqual(children.length, 2);
    ok(children.every((s) => s.parentSessionId === parent.id));
  });

  it("filters by soulId", () => {
    createSession(db, "k1", { soulId: 1 });
    createSession(db, "k2", { soulId: 3 });
    createSession(db, "k3", { soulId: 1 });

    const soul1 = listSessions(db, { soulId: 1 });
    strictEqual(soul1.length, 2);
    ok(soul1.every((s) => s.soulId === 1));

    const soul3 = listSessions(db, { soulId: 3 });
    strictEqual(soul3.length, 1);
  });

  it("includes soulId and error in returned sessions", () => {
    const s = createSession(db, "k", { soulId: 5 });
    db.prepare("UPDATE sessions SET error = ? WHERE id = ?").run("test error", s.id);

    const list = listSessions(db);
    strictEqual(list[0]!.soulId, 5);
    strictEqual(list[0]!.error, "test error");
  });

  it("filters by keyPrefix", () => {
    createSession(db, "telegram:123");
    createSession(db, "telegram:456");
    createSession(db, "web:abc");

    const telegram = listSessions(db, { keyPrefix: "telegram:" });
    strictEqual(telegram.length, 2);
    ok(telegram.every((s) => s.key.startsWith("telegram:")));

    const web = listSessions(db, { keyPrefix: "web:" });
    strictEqual(web.length, 1);
  });

  it("respects limit", () => {
    createSession(db, "k1");
    createSession(db, "k2");
    createSession(db, "k3");

    const limited = listSessions(db, { limit: 2 });
    strictEqual(limited.length, 2);
  });

  it("combines keyPrefix and limit", () => {
    createSession(db, "telegram:1");
    createSession(db, "telegram:2");
    createSession(db, "telegram:3");
    createSession(db, "web:1");

    const result = listSessions(db, { keyPrefix: "telegram:", limit: 1 });
    strictEqual(result.length, 1);
    ok(result[0]!.key.startsWith("telegram:"));
  });
});
