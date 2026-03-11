import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { meetMember } from "./meet_member.ts";
import { removeContact } from "./remove_contact.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("removeContact", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  it("deletes a contact by id", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    const { contact } = addContact(db, { memberId: member.id, type: "email", value: "a@b.com" });

    removeContact(db, contact.id);

    const row = db.prepare("SELECT id FROM pack_contacts WHERE id = ?").get(contact.id);
    strictEqual(row, undefined);
  });

  it("throws for nonexistent contact id", () => {
    throws(() => removeContact(db, 999), /not found/);
  });
});
