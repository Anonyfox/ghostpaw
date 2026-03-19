import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, createSession, renameSession } from "../../../../core/chat/api/write/index.ts";
import { initChatTables } from "../../../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createChatSessionsApiHandlers } from "./chat_sessions_api.ts";

function mockRes() {
  let _status = 0;
  let _body = "";
  return {
    writeHead(status: number, _hdrs?: Record<string, string>) {
      _status = status;
    },
    end(body?: string) {
      _body = body ?? "";
    },
    get status() {
      return _status;
    },
    get body() {
      return _body;
    },
  };
}

function mockReq(body?: unknown) {
  const chunks: Buffer[] = body !== undefined ? [Buffer.from(JSON.stringify(body))] : [];
  return {
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    on(_event: string, _fn: () => void) {},
    [Symbol.asyncIterator]() {
      let idx = 0;
      return {
        next() {
          if (idx < chunks.length) {
            return Promise.resolve({ value: chunks[idx++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}

describe("chat sessions API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createChatSessionsApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
    handlers = createChatSessionsApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("list", () => {
    it("returns empty array when no sessions exist", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(Array.isArray(data));
      strictEqual(data.length, 0);
    });

    it("returns chat sessions with derived titles", () => {
      const session = createSession(db, "web:chat:1", { purpose: "chat" });
      addMessage(db, {
        sessionId: session.id as number,
        role: "user",
        content: "explain monads",
      });

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);

      const data = JSON.parse(res.body);
      strictEqual(data.length, 1);
      strictEqual(data[0].displayName, "explain monads");
      strictEqual(data[0].channel, "web");
    });

    it("uses display_name when set", () => {
      const session = createSession(db, "tui:chat:1", { purpose: "chat" });
      renameSession(db, session.id as number, "My Title");

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);

      const data = JSON.parse(res.body);
      strictEqual(data[0].displayName, "My Title");
      strictEqual(data[0].channel, "tui");
    });

    it("excludes system and distilled sessions", () => {
      createSession(db, "web:chat:1", { purpose: "chat" });
      createSession(db, "system:title:1", { purpose: "system" });

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);

      const data = JSON.parse(res.body);
      strictEqual(data.length, 1);
    });

    it("returns 'New Chat' for sessions without messages", () => {
      createSession(db, "web:chat:1", { purpose: "chat" });

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);

      const data = JSON.parse(res.body);
      strictEqual(data[0].displayName, "New Chat");
    });
  });

  describe("rename", () => {
    it("renames a session", async () => {
      const session = createSession(db, "web:chat:1", { purpose: "chat" });
      const res = mockRes();
      const req = mockReq({ displayName: "Renamed" });
      const ctx = {
        req,
        res,
        params: { id: String(session.id) },
      } as unknown as RouteContext;
      await handlers.rename(ctx);
      strictEqual(res.status, 200);
    });

    it("rejects non-chat sessions", async () => {
      const session = createSession(db, "howl:1", { purpose: "howl" });
      const res = mockRes();
      const req = mockReq({ displayName: "Nope" });
      const ctx = {
        req,
        res,
        params: { id: String(session.id) },
      } as unknown as RouteContext;

      await handlers.rename(ctx);
      strictEqual(res.status, 404);
    });

    it("returns 400 for invalid session ID", async () => {
      const res = mockRes();
      const req = mockReq({ displayName: "Renamed" });
      const ctx = { req, res, params: { id: "abc" } } as unknown as RouteContext;
      await handlers.rename(ctx);
      strictEqual(res.status, 400);
    });

    it("returns 400 for empty displayName", async () => {
      const session = createSession(db, "web:chat:2", { purpose: "chat" });
      const res = mockRes();
      const req = mockReq({ displayName: "" });
      const ctx = { req, res, params: { id: String(session.id) } } as unknown as RouteContext;
      await handlers.rename(ctx);
      strictEqual(res.status, 400);
    });

    it("returns 400 for missing displayName", async () => {
      const session = createSession(db, "web:chat:3", { purpose: "chat" });
      const res = mockRes();
      const req = mockReq({});
      const ctx = { req, res, params: { id: String(session.id) } } as unknown as RouteContext;
      await handlers.rename(ctx);
      strictEqual(res.status, 400);
    });
  });
});
