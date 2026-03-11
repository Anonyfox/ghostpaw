import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable } from "../../../../core/config/index.ts";
import { storeMemory } from "../../../../core/memory/api/write/index.ts";
import { initMemoryTable } from "../../../../core/memory/runtime/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createMemoryApiHandlers } from "./memory_api.ts";

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

function seedMemory(db: DatabaseHandle, claim: string) {
  return storeMemory(db, claim, { source: "explicit", category: "preference" });
}

describe("memory API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createMemoryApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
    initConfigTable(db);
    handlers = createMemoryApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("stats", () => {
    it("returns stats with zero counts for empty db", () => {
      const res = mockRes();
      const ctx = {
        req: { url: "/api/memories/stats" },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.stats(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.active, 0);
      strictEqual(data.total, 0);
      strictEqual(data.strong, 0);
      strictEqual(data.fading, 0);
      strictEqual(data.faint, 0);
    });

    it("returns extended health fields", () => {
      seedMemory(db, "Test memory");
      const res = mockRes();
      const ctx = {
        req: { url: "/api/memories/stats" },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.stats(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(typeof data.bySource === "object");
      ok(typeof data.avgEvidence === "number");
      ok(typeof data.singleEvidence === "number");
      ok(typeof data.recentRevisions === "number");
    });
  });

  describe("list", () => {
    it("returns empty list for empty db", () => {
      const res = mockRes();
      const ctx = { req: { url: "/api/memories" }, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.memories.length, 0);
      strictEqual(data.total, 0);
    });

    it("returns seeded memories", () => {
      seedMemory(db, "User likes dark mode");
      seedMemory(db, "Project uses TypeScript");
      const res = mockRes();
      const ctx = { req: { url: "/api/memories" }, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.memories.length, 2);
      ok(data.memories[0].strength);
      ok(typeof data.memories[0].freshness === "number");
    });
  });

  describe("detail", () => {
    it("returns 404 for nonexistent memory", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "999" } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 404);
    });

    it("returns detail for existing memory", () => {
      const mem = seedMemory(db, "Test memory");
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: String(mem.id) } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.claim, "Test memory");
      strictEqual(data.supersedes, null);
    });
  });

  describe("search", () => {
    it("returns empty results for empty query", () => {
      const res = mockRes();
      const ctx = {
        req: { url: "/api/memories/search?q=" },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.search(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.memories.length, 0);
    });
  });

  describe("command", () => {
    it("exposes a command handler", () => {
      strictEqual(typeof handlers.command, "function");
    });
  });
});
