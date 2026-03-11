import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { listContacts } from "./list_contacts.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("listContacts", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  it("lists all contacts for a member", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "a@b.com" });
    addContact(db, { memberId: member.id, type: "telegram", value: "12345" });

    const contacts = listContacts(db, member.id);
    strictEqual(contacts.length, 2);
  });

  it("filters by type", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "a@b.com" });
    addContact(db, { memberId: member.id, type: "telegram", value: "12345" });

    const contacts = listContacts(db, member.id, { type: "email" });
    strictEqual(contacts.length, 1);
    strictEqual(contacts[0].type, "email");
  });

  it("returns empty array for member with no contacts", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    const contacts = listContacts(db, member.id);
    strictEqual(contacts.length, 0);
  });

  it("orders by type then value", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: member.id, type: "telegram", value: "99" });
    addContact(db, { memberId: member.id, type: "email", value: "z@b.com" });
    addContact(db, { memberId: member.id, type: "email", value: "a@b.com" });

    const contacts = listContacts(db, member.id);
    strictEqual(contacts[0].type, "email");
    strictEqual(contacts[0].value, "a@b.com");
    strictEqual(contacts[1].type, "email");
    strictEqual(contacts[1].value, "z@b.com");
    strictEqual(contacts[2].type, "telegram");
  });
});
