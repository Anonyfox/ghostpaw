import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";

describe("addContact", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  it("adds a contact to a member and returns it", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    const result = addContact(db, {
      memberId: member.id,
      type: "email",
      value: "alice@example.com",
      label: "work",
    });
    strictEqual(result.conflict, null);
    strictEqual(result.contact.memberId, member.id);
    strictEqual(result.contact.type, "email");
    strictEqual(result.contact.value, "alice@example.com");
    strictEqual(result.contact.label, "work");
    ok(result.contact.id > 0);
  });

  it("returns existing contact without conflict when same member owns it", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "alice@example.com" });
    const result = addContact(db, {
      memberId: member.id,
      type: "email",
      value: "alice@example.com",
    });
    strictEqual(result.conflict, null);
    strictEqual(result.contact.memberId, member.id);
  });

  it("returns conflict when another member owns the contact", () => {
    const alice = meetMember(db, { name: "Alice", kind: "human" });
    const bob = meetMember(db, { name: "Bob", kind: "human" });
    addContact(db, { memberId: alice.id, type: "email", value: "shared@example.com" });
    const result = addContact(db, { memberId: bob.id, type: "email", value: "shared@example.com" });
    ok(result.conflict !== null);
    strictEqual(result.conflict.existingMemberId, alice.id);
  });

  it("trims whitespace from value", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    const result = addContact(db, {
      memberId: member.id,
      type: "email",
      value: "  alice@example.com  ",
    });
    strictEqual(result.contact.value, "alice@example.com");
  });

  it("stores null label when not provided", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    const result = addContact(db, { memberId: member.id, type: "telegram", value: "12345" });
    strictEqual(result.contact.label, null);
  });

  it("rejects invalid contact type", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    throws(
      () => addContact(db, { memberId: member.id, type: "fax" as never, value: "123" }),
      /Invalid contact type/,
    );
  });

  it("rejects empty value", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    throws(
      () => addContact(db, { memberId: member.id, type: "email", value: "   " }),
      /must not be empty/,
    );
  });

  it("rejects nonexistent member", () => {
    throws(() => addContact(db, { memberId: 999, type: "email", value: "x@y.com" }), /not found/);
  });
});
