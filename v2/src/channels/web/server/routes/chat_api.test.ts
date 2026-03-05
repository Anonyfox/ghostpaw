import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../../../core/chat/index.ts";
import { initConfigTable } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createChatApiHandlers } from "./chat_api.ts";

function mockRes() {
  let _status = 0;
  let _body = "";
  const headers = new Map<string, string>();
  return {
    writeHead(status: number, hdrs?: Record<string, string>) {
      _status = status;
      if (hdrs) for (const [k, v] of Object.entries(hdrs)) headers.set(k, v);
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
    get headers() {
      return headers;
    },
  };
}

describe("chat API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createChatApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
    initConfigTable(db);
    handlers = createChatApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create", () => {
    it("returns 200 with session info", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.create(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(typeof data.sessionId === "number");
      ok(typeof data.model === "string");
      strictEqual(data.totalTokens, 0);
    });
  });

  describe("history", () => {
    it("returns 404 for non-existent session", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "999" } } as unknown as RouteContext;
      handlers.history(ctx);
      strictEqual(res.status, 404);
    });

    it("returns 400 for invalid session ID", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "abc" } } as unknown as RouteContext;
      handlers.history(ctx);
      strictEqual(res.status, 400);
    });

    it("returns session info and empty messages for new session", () => {
      const createRes = mockRes();
      const createCtx = {
        req: {},
        res: createRes,
        params: {},
      } as unknown as RouteContext;
      handlers.create(createCtx);
      const { sessionId } = JSON.parse(createRes.body);

      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { id: String(sessionId) },
      } as unknown as RouteContext;
      handlers.history(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(Array.isArray(data.messages));
      strictEqual(data.messages.length, 0);
      strictEqual(data.session.sessionId, sessionId);
    });
  });
});
