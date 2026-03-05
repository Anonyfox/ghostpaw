import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables, meetMember, noteInteraction } from "../../../../core/pack/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import { openTestDatabase } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";
import { createPackApiHandlers } from "./pack_api.ts";

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

describe("pack API", () => {
  let db: DatabaseHandle;
  let handlers: ReturnType<typeof createPackApiHandlers>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    handlers = createPackApiHandlers(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("list", () => {
    it("returns empty list for empty db", () => {
      const res = mockRes();
      const ctx = { req: { url: "/api/pack" }, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.members.length, 0);
      strictEqual(data.counts.total, 0);
    });

    it("returns seeded members", () => {
      meetMember(db, { name: "Alice", kind: "human" });
      meetMember(db, { name: "Bob", kind: "agent" });
      const res = mockRes();
      const ctx = { req: { url: "/api/pack" }, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.members.length, 2);
      ok(data.members[0].trustLevel);
    });
  });

  describe("stats", () => {
    it("returns counts for empty db", () => {
      const res = mockRes();
      const ctx = { req: { url: "/api/pack/stats" }, res, params: {} } as unknown as RouteContext;
      handlers.stats(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.active, 0);
      strictEqual(data.total, 0);
    });
  });

  describe("detail", () => {
    it("returns 404 for nonexistent member", () => {
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: "999" } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 404);
    });

    it("returns detail for existing member", () => {
      const member = meetMember(db, { name: "Alice", kind: "human", bond: "A close ally." });
      noteInteraction(db, {
        memberId: member.id,
        kind: "conversation",
        summary: "Talked about plans",
      });
      const res = mockRes();
      const ctx = { req: {}, res, params: { id: String(member.id) } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.name, "Alice");
      strictEqual(data.interactions.length, 1);
      ok(data.trustLevel);
    });
  });

  describe("interactions", () => {
    it("returns interactions for a member", () => {
      const member = meetMember(db, { name: "Eve", kind: "human" });
      noteInteraction(db, { memberId: member.id, kind: "gift", summary: "Shared a resource" });
      const res = mockRes();
      const ctx = {
        req: { url: `/api/pack/${member.id}/interactions` },
        res,
        params: { id: String(member.id) },
      } as unknown as RouteContext;
      handlers.interactions(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.interactions.length, 1);
    });
  });
});
