import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setField } from "../../../../core/pack/fields.ts";
import {
  addContact,
  initPackTables,
  meetMember,
  noteInteraction,
} from "../../../../core/pack/index.ts";
import { addLink } from "../../../../core/pack/links.ts";
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

    it("returns members with nickname and tags", () => {
      const m = meetMember(db, { name: "Alice", kind: "human", nickname: "Ali" });
      setField(db, m.id, "client");
      meetMember(db, { name: "Bob", kind: "agent" });
      const res = mockRes();
      const ctx = { req: { url: "/api/pack" }, res, params: {} } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.members.length, 2);
      ok(data.members.some((m: { nickname: string }) => m.nickname === "Ali"));
      ok(data.members.some((m: { tags: string[] }) => m.tags.includes("client")));
    });

    it("applies field and search filters", () => {
      const alice = meetMember(db, { name: "Alice", kind: "human", bond: "VIP client" });
      setField(db, alice.id, "vip");
      meetMember(db, { name: "Bob", kind: "human", bond: "friend" });

      const res = mockRes();
      const ctx = {
        req: { url: "/api/pack?field=vip&search=client" },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.list(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.members.length, 1);
      strictEqual(data.members[0].name, "Alice");
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

    it("returns full detail with fields, links, and contacts", () => {
      const member = meetMember(db, {
        name: "Alice",
        kind: "human",
        bond: "A close ally.",
        nickname: "Ali",
        timezone: "Europe/Berlin",
      });
      noteInteraction(db, {
        memberId: member.id,
        kind: "conversation",
        summary: "Talked about plans",
      });
      addContact(db, { memberId: member.id, type: "email", value: "alice@test.com" });
      setField(db, member.id, "client");
      setField(db, member.id, "billing_rate", "100/hr");
      const org = meetMember(db, { name: "Acme", kind: "group" });
      addLink(db, member.id, org.id, "works-at");

      const res = mockRes();
      const ctx = { req: {}, res, params: { id: String(member.id) } } as unknown as RouteContext;
      handlers.detail(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.name, "Alice");
      strictEqual(data.nickname, "Ali");
      strictEqual(data.timezone, "Europe/Berlin");
      strictEqual(data.interactions.length, 1);
      strictEqual(data.contacts.length, 1);
      strictEqual(data.fields.length, 2);
      strictEqual(data.links.length, 1);
      strictEqual(data.links[0].targetName, "Acme");
      ok(data.trustLevel);
    });
  });

  describe("patrol", () => {
    it("returns compact patrol items", () => {
      const member = meetMember(db, { name: "Alice", kind: "human", birthday: "1992-03-12" });
      db.prepare("UPDATE pack_members SET trust = ?, last_contact = ? WHERE id = ?").run(
        0.9,
        new Date(2026, 1, 20).getTime(),
        member.id,
      );
      noteInteraction(db, {
        memberId: member.id,
        kind: "conflict",
        summary: "rough patch",
        occurredAt: new Date(2026, 2, 8).getTime(),
      });

      const res = mockRes();
      const ctx = {
        req: { url: "/api/pack/patrol" },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.patrol(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      ok(Array.isArray(data.patrol));
      ok(data.patrol.length >= 1);
    });
  });

  describe("mergePreview", () => {
    it("returns merge preview details", () => {
      const keep = meetMember(db, { name: "Alice", kind: "human", timezone: "UTC" });
      const merge = meetMember(db, { name: "Alexander", kind: "human", timezone: "Europe/Berlin" });
      setField(db, keep.id, "client", "yes");
      setField(db, merge.id, "client", "priority");
      const manager = meetMember(db, { name: "Manager", kind: "human" });
      addLink(db, manager.id, keep.id, "manages");
      addLink(db, manager.id, merge.id, "manages");

      const res = mockRes();
      const ctx = {
        req: { url: `/api/pack/merge-preview?keep=${keep.id}&merge=${merge.id}` },
        res,
        params: {},
      } as unknown as RouteContext;
      handlers.mergePreview(ctx);
      strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      strictEqual(data.keepMember.name, "Alice");
      strictEqual(data.mergeMember.name, "Alexander");
      ok(Array.isArray(data.memberChoices));
      ok(Array.isArray(data.linkConflicts));
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
});
