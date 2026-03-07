import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  addContact,
  initPackTables,
  meetMember,
  noteInteraction,
} from "../../../../core/pack/index.ts";
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

    it("returns detail with contacts for existing member", () => {
      const member = meetMember(db, { name: "Alice", kind: "human", bond: "A close ally." });
      noteInteraction(db, {
        memberId: member.id,
        kind: "conversation",
        summary: "Talked about plans",
      });
      addContact(db, { memberId: member.id, type: "email", value: "alice@test.com" });

      const res = mockRes();
      const ctx = { req: {}, res, params: { id: String(member.id) } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.name, "Alice");
      strictEqual(data.interactions.length, 1);
      strictEqual(data.contacts.length, 1);
      strictEqual(data.contacts[0].type, "email");
      strictEqual(data.isUser, false);
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

  describe("contacts", () => {
    it("returns contacts for a member", () => {
      const member = meetMember(db, { name: "Carol", kind: "human" });
      addContact(db, { memberId: member.id, type: "telegram", value: "12345" });
      const res = mockRes();
      const ctx = {
        req: { url: `/api/pack/${member.id}/contacts` },
        res,
        params: { id: String(member.id) },
      } as unknown as RouteContext;
      handlers.contacts(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.contacts.length, 1);
      strictEqual(data.contacts[0].type, "telegram");
    });
  });

  describe("removeContact", () => {
    it("removes an existing contact", () => {
      const member = meetMember(db, { name: "Dave", kind: "human" });
      const { contact } = addContact(db, { memberId: member.id, type: "email", value: "d@t.com" });
      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { contactId: String(contact.id) },
      } as unknown as RouteContext;
      handlers.removeContact(ctx);
      strictEqual(res.status, 200);
    });

    it("returns 404 for nonexistent contact", () => {
      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { contactId: "999" },
      } as unknown as RouteContext;
      handlers.removeContact(ctx);
      strictEqual(res.status, 404);
    });
  });

  describe("lookupContact", () => {
    it("finds member by contact", () => {
      const member = meetMember(db, { name: "Find", kind: "human" });
      addContact(db, { memberId: member.id, type: "github", value: "findme" });
      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { type: "github", value: "findme" },
      } as unknown as RouteContext;
      handlers.lookupContact(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.found, true);
      strictEqual(data.member.name, "Find");
    });

    it("returns 404 when not found", () => {
      const res = mockRes();
      const ctx = {
        req: {},
        res,
        params: { type: "email", value: "nobody@no.com" },
      } as unknown as RouteContext;
      handlers.lookupContact(ctx);
      strictEqual(res.status, 404);
    });
  });
});
