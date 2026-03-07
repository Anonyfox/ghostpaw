import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { addMessage, createSession, initChatTables } from "../../../../core/chat/index.ts";
import { initConfigTable } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import { createSessionsApiHandlers } from "./sessions_api.ts";

function mockCtx(params: Record<string, string> = {}, url = "") {
  let statusCode = 0;
  let body = "";
  const ctx = {
    req: { url } as never,
    res: {
      writeHead(code: number) {
        statusCode = code;
      },
      end(data: string) {
        body = data;
      },
    } as never,
    params,
  };
  return {
    ctx,
    status: () => statusCode,
    json: () => JSON.parse(body),
  };
}

describe("sessions_api", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    initChatTables(db);
  });

  it("list returns empty when no sessions", () => {
    const handlers = createSessionsApiHandlers(db);
    const { ctx, status, json } = mockCtx();
    handlers.list(ctx);
    strictEqual(status(), 200);
    const data = json();
    ok(Array.isArray(data.sessions));
    strictEqual(data.sessions.length, 0);
    strictEqual(data.total, 0);
  });

  it("list returns sessions with enriched data", () => {
    const s = createSession(db, "web:chat:1");
    addMessage(db, { sessionId: s.id, role: "user", content: "Hello world" });

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.list(ctx);
    const data = json();
    strictEqual(data.sessions.length, 1);
    strictEqual(data.sessions[0].channel, "web");
    strictEqual(data.sessions[0].purpose, "chat");
    strictEqual(data.sessions[0].status, "open");
    strictEqual(data.sessions[0].messageCount, 1);
    ok(data.sessions[0].preview.includes("Hello"));
  });

  it("list filters by channel", () => {
    createSession(db, "web:chat:1");
    createSession(db, "telegram:123");

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx({}, "/api/sessions?channel=web");
    handlers.list(ctx);
    const data = json();
    strictEqual(data.sessions.length, 1);
    strictEqual(data.sessions[0].channel, "web");
  });

  it("list filters by status", () => {
    createSession(db, "web:chat:1");
    const s2 = createSession(db, "web:chat:2");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s2.id);

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx({}, "/api/sessions?status=open");
    handlers.list(ctx);
    strictEqual(json().sessions.length, 1);
  });

  it("stats returns correct counts", () => {
    createSession(db, "web:chat:1");
    createSession(db, "telegram:123");
    const s3 = createSession(db, "web:chat:2");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s3.id);

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.stats(ctx);
    const data = json();
    strictEqual(data.total, 3);
    strictEqual(data.open, 2);
    strictEqual(data.closed, 1);
    ok(data.byChannel.web >= 2);
    ok(data.byChannel.telegram >= 1);
  });

  it("detail returns session with messages and runs", () => {
    const s = createSession(db, "web:chat:1");
    addMessage(db, { sessionId: s.id, role: "user", content: "test message" });

    const handlers = createSessionsApiHandlers(db);
    const { ctx, status, json } = mockCtx({ id: String(s.id) });
    handlers.detail(ctx);
    strictEqual(status(), 200);
    const data = json();
    strictEqual(data.session.id, s.id);
    ok(data.messages.length >= 1);
    ok(Array.isArray(data.runs));
    strictEqual(data.parentSession, null);
  });

  it("detail returns 404 for missing session", () => {
    const handlers = createSessionsApiHandlers(db);
    const { ctx, status } = mockCtx({ id: "99999" });
    handlers.detail(ctx);
    strictEqual(status(), 404);
  });

  it("prune removes empty closed sessions", () => {
    const s = createSession(db, "web:chat:1");
    db.prepare("UPDATE sessions SET closed_at = ?, created_at = ? WHERE id = ?").run(
      Date.now() - 7200000,
      Date.now() - 7200000,
      s.id,
    );

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.prune(ctx);
    const data = json();
    strictEqual(data.pruned, 1);
  });

  it("prune removes empty open sessions older than 1 hour", () => {
    const s = createSession(db, "web:chat:1");
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(Date.now() - 7200000, s.id);

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.prune(ctx);
    strictEqual(json().pruned, 1);
  });

  it("prune does not remove sessions with messages", () => {
    const s = createSession(db, "web:chat:1");
    addMessage(db, { sessionId: s.id, role: "user", content: "keep me" });
    db.prepare("UPDATE sessions SET closed_at = ?, created_at = ? WHERE id = ?").run(
      Date.now() - 7200000,
      Date.now() - 7200000,
      s.id,
    );

    const handlers = createSessionsApiHandlers(db);
    const { ctx, json } = mockCtx();
    handlers.prune(ctx);
    strictEqual(json().pruned, 0);
  });
});
