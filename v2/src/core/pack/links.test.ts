import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { addLink, listLinkedMembers, listLinks, removeLink } from "./links.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("addLink", () => {
  it("creates a link between two members", () => {
    const alice = meetMember(db, { name: "Alice", kind: "human" });
    const acme = meetMember(db, { name: "Acme Corp", kind: "group" });
    const link = addLink(db, alice.id, acme.id, "works-at", "CTO");
    strictEqual(link.memberId, alice.id);
    strictEqual(link.targetId, acme.id);
    strictEqual(link.label, "works-at");
    strictEqual(link.role, "CTO");
    strictEqual(link.active, true);
  });

  it("upserts on conflict — updates role and reactivates", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, a.id, b.id, "manages", "team-lead");
    const updated = addLink(db, a.id, b.id, "manages", "director");
    strictEqual(updated.role, "director");
    strictEqual(listLinks(db, a.id).length, 1);
  });

  it("normalizes label to lowercase trimmed", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    const link = addLink(db, a.id, b.id, "  Works-At  ");
    strictEqual(link.label, "works-at");
  });

  it("throws on empty label", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    throws(() => addLink(db, a.id, b.id, ""), /non-empty/);
  });

  it("throws on self-link", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    throws(() => addLink(db, a.id, a.id, "manages"), /itself/);
  });

  it("supports multiple labels between same pair", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, a.id, b.id, "manages");
    addLink(db, a.id, b.id, "mentors");
    strictEqual(listLinks(db, a.id).length, 2);
  });
});

describe("removeLink", () => {
  it("deletes a link", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, a.id, b.id, "manages");
    removeLink(db, a.id, b.id, "manages");
    strictEqual(listLinks(db, a.id).length, 0);
  });
});

describe("listLinks", () => {
  it("returns all links from a member sorted by label", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    const c = meetMember(db, { name: "Acme", kind: "group" });
    addLink(db, a.id, c.id, "works-at");
    addLink(db, a.id, b.id, "manages");
    const links = listLinks(db, a.id);
    strictEqual(links.length, 2);
    strictEqual(links[0].label, "manages");
    strictEqual(links[1].label, "works-at");
  });
});

describe("listLinkedMembers", () => {
  it("returns all links to a target", () => {
    const acme = meetMember(db, { name: "Acme", kind: "group" });
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, a.id, acme.id, "works-at");
    addLink(db, b.id, acme.id, "works-at");
    const linked = listLinkedMembers(db, acme.id);
    strictEqual(linked.length, 2);
  });

  it("filters by label", () => {
    const acme = meetMember(db, { name: "Acme", kind: "group" });
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, a.id, acme.id, "works-at");
    addLink(db, b.id, acme.id, "client-of");
    const worksAt = listLinkedMembers(db, acme.id, "works-at");
    strictEqual(worksAt.length, 1);
    strictEqual(worksAt[0].memberId, a.id);
  });
});
