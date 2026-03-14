import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, closeSession, createSession } from "../../../../core/chat/api/write/index.ts";
import { initChatTables } from "../../../../core/chat/runtime/index.ts";
import { initConfigTable } from "../../../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../../../core/memory/runtime/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createDistillApiHandlers } from "./distill_api.ts";

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

function addChainedMessages(
  db: DatabaseHandle,
  sessionId: number,
  pairs: [string, string][],
): void {
  let parentId: number | undefined;
  for (const [userContent, assistantContent] of pairs) {
    const m1 = addMessage(db, { sessionId, role: "user", content: userContent, parentId });
    const m2 = addMessage(db, {
      sessionId,
      role: "assistant",
      content: assistantContent,
      parentId: m1.id as number,
    });
    parentId = m2.id as number;
  }
}

describe("distill API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createDistillApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    initChatTables(db);
    initMemoryTable(db);
    handlers = createDistillApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("GET /api/distill/status", () => {
    it("returns zero when no eligible sessions exist", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.status(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.undistilledCount, 0);
    });

    it("counts closed chat sessions as undistilled", () => {
      const session = createSession(db, "web:test", { purpose: "chat" });
      addChainedMessages(db, session.id, [["hello", "hi there"]]);
      closeSession(db, session.id);

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.status(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.undistilledCount, 1);
    });

    it("excludes system purpose sessions", () => {
      const session = createSession(db, "system:test", { purpose: "system" });
      addChainedMessages(db, session.id, [["hello", "hi"]]);
      closeSession(db, session.id);

      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      handlers.status(ctx);
      const data = JSON.parse(res.body);
      strictEqual(data.undistilledCount, 0);
    });
  });

  describe("POST /api/distill (sweep)", () => {
    it("returns zeros when no eligible sessions exist", async () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: {} } as unknown as RouteContext;
      await handlers.sweep(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.sessionsProcessed, 0);
      strictEqual(data.sessionsSkipped, 0);
    });
  });

  describe("POST /api/distill/:id (single)", () => {
    it("returns 400 for invalid session ID", async () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "abc" } } as unknown as RouteContext;
      await handlers.single(ctx);
      strictEqual(res.status, 400);
      const data = JSON.parse(res.body);
      ok(data.error);
    });

    it("returns skipped result for non-existent session", async () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "99999" } } as unknown as RouteContext;
      await handlers.single(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.skipped, true);
    });

    it("returns skipped for session with wrong purpose", async () => {
      const session = createSession(db, "system:test", { purpose: "system" });
      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { id: String(session.id) },
      } as unknown as RouteContext;
      await handlers.single(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.skipped, true);
    });
  });
});
