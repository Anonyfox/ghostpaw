import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("meetMember", () => {
  it("creates a member and returns it with an autoincrement ID", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    strictEqual(member.id, 1);
    strictEqual(member.name, "Alice");
    strictEqual(member.kind, "human");
    strictEqual(member.bond, "");
    strictEqual(member.trust, 0.5);
    strictEqual(member.status, "active");
    strictEqual(member.isUser, false);
  });

  it("sets timestamps to approximately now", () => {
    const before = Date.now();
    const member = meetMember(db, { name: "Bob", kind: "agent" });
    const after = Date.now();
    ok(member.createdAt >= before && member.createdAt <= after);
    ok(member.updatedAt >= before && member.updatedAt <= after);
    ok(member.firstContact >= before && member.firstContact <= after);
    ok(member.lastContact >= before && member.lastContact <= after);
  });

  it("stores a provided bond text", () => {
    const member = meetMember(db, {
      name: "Carol",
      kind: "human",
      bond: "First impression: thoughtful and direct.",
    });
    strictEqual(member.bond, "First impression: thoughtful and direct.");
  });

  it("trims bond text", () => {
    const member = meetMember(db, { name: "Dan", kind: "human", bond: "  padded  " });
    strictEqual(member.bond, "padded");
  });

  it("creates a member with isUser flag", () => {
    const member = meetMember(db, { name: "Owner", kind: "human", isUser: true });
    strictEqual(member.isUser, true);
  });

  it("auto-increments IDs", () => {
    const a = meetMember(db, { name: "A", kind: "human" });
    const b = meetMember(db, { name: "B", kind: "agent" });
    strictEqual(a.id, 1);
    strictEqual(b.id, 2);
  });

  it("throws on empty name", () => {
    throws(() => meetMember(db, { name: "", kind: "human" }), /non-empty/);
  });

  it("throws on whitespace-only name", () => {
    throws(() => meetMember(db, { name: "   ", kind: "human" }), /non-empty/);
  });

  it("throws on invalid kind", () => {
    throws(() => meetMember(db, { name: "X", kind: "alien" as "human" }), /Invalid member kind/);
  });

  it("throws on duplicate active name", () => {
    meetMember(db, { name: "Dupe", kind: "human" });
    throws(() => meetMember(db, { name: "Dupe", kind: "agent" }));
  });

  it("trims the name before storing", () => {
    const member = meetMember(db, { name: "  Trimmed  ", kind: "human" });
    strictEqual(member.name, "Trimmed");
  });

  it("rejects second isUser member", () => {
    meetMember(db, { name: "First", kind: "human", isUser: true });
    throws(() => meetMember(db, { name: "Second", kind: "human", isUser: true }));
  });

  it("stores universal columns", () => {
    const member = meetMember(db, {
      name: "Sarah",
      kind: "human",
      nickname: "S",
      timezone: "Europe/Berlin",
      locale: "de-DE",
      location: "Berlin",
      address: "123 Main St",
      pronouns: "she/her",
      birthday: "1990-05-15",
    });
    strictEqual(member.nickname, "S");
    strictEqual(member.timezone, "Europe/Berlin");
    strictEqual(member.locale, "de-DE");
    strictEqual(member.location, "Berlin");
    strictEqual(member.address, "123 Main St");
    strictEqual(member.pronouns, "she/her");
    strictEqual(member.birthday, "1990-05-15");
  });

  it("stores parentId", () => {
    const parent = meetMember(db, { name: "Acme Corp", kind: "group" });
    const child = meetMember(db, { name: "Acme EU", kind: "group", parentId: parent.id });
    strictEqual(child.parentId, parent.id);
  });

  it("creates initial tags via tags array", () => {
    const member = meetMember(db, { name: "Client1", kind: "human", tags: ["client", "vip"] });
    const rows = db
      .prepare("SELECT key FROM pack_fields WHERE member_id = ? ORDER BY key")
      .all(member.id) as { key: string }[];
    strictEqual(rows.length, 2);
    strictEqual(rows[0].key, "client");
    strictEqual(rows[1].key, "vip");
  });

  it("accepts group kind", () => {
    const m = meetMember(db, { name: "Book Club", kind: "group" });
    strictEqual(m.kind, "group");
  });

  it("universal columns default to null", () => {
    const member = meetMember(db, { name: "Plain", kind: "human" });
    strictEqual(member.nickname, null);
    strictEqual(member.timezone, null);
    strictEqual(member.parentId, null);
  });
});
