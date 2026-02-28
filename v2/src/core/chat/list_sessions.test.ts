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

  it("filters by absorbed status", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ?").run(Date.now(), s2.id);

    const notAbsorbed = listSessions(db, { absorbed: false });
    strictEqual(notAbsorbed.length, 1);
    strictEqual(notAbsorbed[0]!.id, s1.id);

    const absorbed = listSessions(db, { absorbed: true });
    strictEqual(absorbed.length, 1);
    strictEqual(absorbed[0]!.id, s2.id);
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

  it("returns all when filter is undefined", () => {
    createSession(db, "k1");
    createSession(db, "k2");
    strictEqual(listSessions(db).length, 2);
    strictEqual(listSessions(db, {}).length, 2);
  });
});
