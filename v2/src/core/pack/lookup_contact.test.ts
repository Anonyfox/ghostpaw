import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { lookupContact } from "./lookup_contact.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("lookupContact", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  it("finds a member by contact type and value", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "alice@example.com" });

    const found = lookupContact(db, "email", "alice@example.com");
    ok(found !== null);
    strictEqual(found.id, member.id);
    strictEqual(found.name, "Alice");
  });

  it("returns null when no member has the contact", () => {
    const found = lookupContact(db, "email", "nobody@example.com");
    strictEqual(found, null);
  });

  it("trims whitespace from value", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "telegram", value: "12345" });

    const found = lookupContact(db, "telegram", "  12345  ");
    ok(found !== null);
    strictEqual(found.id, member.id);
  });

  it("matches canonicalized email values", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "Alice@Example.COM" });

    const found = lookupContact(db, "email", "alice@example.com");
    ok(found !== null);
    strictEqual(found.id, member.id);
  });

  it("matches canonicalized handle values", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "telegram", value: "AliceWolf" });

    const found = lookupContact(db, "telegram", "alicewolf");
    ok(found !== null);
    strictEqual(found.id, member.id);
  });

  it("does not resolve a lost member by default", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "alice@example.com" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(member.id);

    strictEqual(lookupContact(db, "email", "alice@example.com"), null);
  });

  it("rejects invalid type", () => {
    throws(() => lookupContact(db, "fax" as never, "123"), /Invalid contact type/);
  });

  it("rejects empty value", () => {
    throws(() => lookupContact(db, "email", "   "), /must not be empty/);
  });
});
