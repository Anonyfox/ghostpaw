import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../../../core/chat/index.ts";
import { initConfigTable } from "../../../../core/config/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createChatApiHandlers } from "./chat_api.ts";
import { sseConnections } from "./chat_sse_connections.ts";

function mockRes() {
  let _status = 0;
  let _body = "";
  const headers = new Map<string, string>();
  const written: string[] = [];
  return {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    writeHead(status: number, hdrs?: Record<string, string>) {
      _status = status;
      if (hdrs) for (const [k, v] of Object.entries(hdrs)) headers.set(k, v);
    },
    end(body?: string) {
      _body = body ?? "";
    },
    write(data: string) {
      written.push(data);
      return true;
    },
    on(_event: string, _fn: () => void) {},
    get status() {
      return _status;
    },
    get body() {
      return _body;
    },
    get headers() {
      return headers;
    },
    get written() {
      return written;
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

  describe("stream", () => {
    it("sets up SSE connection with correct headers", () => {
      const res = mockRes();
      const req = { on: () => {} };
      const ctx = {
        req,
        res,
        params: { id: "1" },
      } as unknown as RouteContext;
      handlers.stream(ctx);
      strictEqual(res.status, 200);
      strictEqual(res.headers.get("Content-Type"), "text/event-stream");
      strictEqual(res.headers.get("Cache-Control"), "no-cache");
      sseConnections.remove(1);
    });

    it("returns 400 for invalid session ID", () => {
      const res = mockRes();
      const ctx = {
        req: { on: () => {} },
        res,
        params: { id: "abc" },
      } as unknown as RouteContext;
      handlers.stream(ctx);
      strictEqual(res.status, 400);
    });
  });

  describe("send", () => {
    it("returns 400 for invalid session ID", async () => {
      const res = mockRes();
      const req = mockReq({ content: "hi" });
      const ctx = { req, res, params: { id: "abc" } } as unknown as RouteContext;
      await handlers.send(ctx);
      strictEqual(res.status, 400);
    });

    it("returns 400 for missing content", async () => {
      const res = mockRes();
      const req = mockReq({ content: "" });
      const ctx = { req, res, params: { id: "1" } } as unknown as RouteContext;
      await handlers.send(ctx);
      strictEqual(res.status, 400);
    });

    it("returns 409 when no SSE connection exists", async () => {
      const res = mockRes();
      const req = mockReq({ content: "hello" });
      const ctx = { req, res, params: { id: "1" } } as unknown as RouteContext;
      await handlers.send(ctx);
      strictEqual(res.status, 409);
    });
  });
});
