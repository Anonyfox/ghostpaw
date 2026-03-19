import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { querySessionsPage } from "./query_sessions_page.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("querySessionsPage", () => {
  it("returns empty result on empty database", () => {
    const result = querySessionsPage(db);
    strictEqual(result.total, 0);
    strictEqual(result.sessions.length, 0);
  });

  it("returns sessions with message and delegation counts", () => {
    const parent = createSession(db, "web:main");
    addMessage(db, { sessionId: parent.id, role: "user", content: "hello" });
    addMessage(db, { sessionId: parent.id, role: "assistant", content: "hi" });
    createSession(db, "delegate:1", { purpose: "delegate", parentSessionId: parent.id });
    createSession(db, "delegate:2", { purpose: "delegate", parentSessionId: parent.id });

    const result = querySessionsPage(db);
    strictEqual(result.total, 3);

    const parentResult = result.sessions.find((s) => s.id === parent.id)!;
    strictEqual(parentResult.messageCount, 2);
    strictEqual(parentResult.delegationCount, 2);
  });

  it("filters by channel prefix", () => {
    createSession(db, "web:abc");
    createSession(db, "telegram:xyz");
    createSession(db, "web:def");

    const result = querySessionsPage(db, { filter: { channel: "web" } });
    strictEqual(result.total, 2);
    ok(result.sessions.every((s) => s.key.startsWith("web:")));
  });

  it("filters by purpose", () => {
    createSession(db, "k1", { purpose: "chat" });
    createSession(db, "k2", { purpose: "delegate" });
    createSession(db, "k3", { purpose: "chat" });

    const result = querySessionsPage(db, { filter: { purpose: "chat" } });
    strictEqual(result.total, 2);
    ok(result.sessions.every((s) => s.purpose === "chat"));
  });

  it("filters by status open", () => {
    createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s2.id);

    const result = querySessionsPage(db, { filter: { status: "open" } });
    strictEqual(result.total, 1);
    strictEqual(result.sessions[0]!.closedAt, null);
  });

  it("filters by status closed (not distilled)", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET closed_at = ?, distilled_at = ? WHERE id = ?").run(
      Date.now(),
      Date.now(),
      s2.id,
    );
    createSession(db, "k3");

    const result = querySessionsPage(db, { filter: { status: "closed" } });
    strictEqual(result.total, 1);
    strictEqual(result.sessions[0]!.id, s1.id);
  });

  it("filters by status distilled", () => {
    createSession(db, "k1");
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET closed_at = ?, distilled_at = ? WHERE id = ?").run(
      Date.now(),
      Date.now(),
      s2.id,
    );

    const result = querySessionsPage(db, { filter: { status: "distilled" } });
    strictEqual(result.total, 1);
    strictEqual(result.sessions[0]!.id, s2.id);
  });

  it("filters by display_name search", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET display_name = ? WHERE id = ?").run("Alpha wolf", s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET display_name = ? WHERE id = ?").run("Beta testing", s2.id);

    const result = querySessionsPage(db, { filter: { search: "wolf" } });
    strictEqual(result.total, 1);
    strictEqual(result.sessions[0]!.id, s1.id);
  });

  it("sorts by recent (default)", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(1000, s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(3000, s2.id);

    const result = querySessionsPage(db);
    strictEqual(result.sessions[0]!.id, s2.id);
    strictEqual(result.sessions[1]!.id, s1.id);
  });

  it("sorts by oldest", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(1000, s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(3000, s2.id);

    const result = querySessionsPage(db, { sort: "oldest" });
    strictEqual(result.sessions[0]!.id, s1.id);
  });

  it("sorts by expensive", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET cost_usd = ? WHERE id = ?").run(0.5, s1.id);
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET cost_usd = ? WHERE id = ?").run(2.0, s2.id);

    const result = querySessionsPage(db, { sort: "expensive" });
    strictEqual(result.sessions[0]!.id, s2.id);
  });

  it("sorts by tokens", () => {
    const s1 = createSession(db, "k1");
    db.prepare("UPDATE sessions SET tokens_in = ?, tokens_out = ? WHERE id = ?").run(
      100,
      50,
      s1.id,
    );
    const s2 = createSession(db, "k2");
    db.prepare("UPDATE sessions SET tokens_in = ?, tokens_out = ? WHERE id = ?").run(
      500,
      500,
      s2.id,
    );

    const result = querySessionsPage(db, { sort: "tokens" });
    strictEqual(result.sessions[0]!.id, s2.id);
  });

  it("paginates with limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `k${i}`);
      db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(i * 1000, s.id);
    }

    const page1 = querySessionsPage(db, { limit: 2, offset: 0 });
    strictEqual(page1.total, 5);
    strictEqual(page1.sessions.length, 2);

    const page2 = querySessionsPage(db, { limit: 2, offset: 2 });
    strictEqual(page2.sessions.length, 2);

    const page3 = querySessionsPage(db, { limit: 2, offset: 4 });
    strictEqual(page3.sessions.length, 1);
  });

  it("clamps limit to 200 max", () => {
    for (let i = 0; i < 3; i++) createSession(db, `k${i}`);

    const result = querySessionsPage(db, { limit: 999 });
    strictEqual(result.sessions.length, 3);
  });

  it("combines filters with pagination", () => {
    for (let i = 0; i < 4; i++) {
      const s = createSession(db, `web:${i}`, { purpose: "chat" });
      db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(i * 1000, s.id);
    }
    createSession(db, "telegram:1", { purpose: "delegate" });

    const result = querySessionsPage(db, {
      filter: { channel: "web", purpose: "chat" },
      limit: 2,
      offset: 1,
    });
    strictEqual(result.total, 4);
    strictEqual(result.sessions.length, 2);
  });
});
