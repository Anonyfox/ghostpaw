import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { setField } from "./fields.ts";
import { addLink } from "./links.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./runtime/schema.ts";
import { senseMember } from "./sense_member.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("senseMember", () => {
  it("returns member with interactions and contacts", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "First chat." });
    noteInteraction(db, { memberId: m.id, kind: "milestone", summary: "Finished task." });
    addContact(db, { memberId: m.id, type: "email", value: "alice@example.com" });

    const detail = senseMember(db, m.id);
    ok(detail !== null);
    strictEqual(detail.member.name, "Alice");
    strictEqual(detail.interactions.length, 2);
    strictEqual(detail.contacts.length, 1);
    strictEqual(detail.contacts[0].type, "email");
  });

  it("returns null for nonexistent member", () => {
    strictEqual(senseMember(db, 999), null);
  });

  it("returns member with empty interactions and contacts when none exist", () => {
    const m = meetMember(db, { name: "Bob", kind: "agent" });
    const detail = senseMember(db, m.id);
    ok(detail !== null);
    strictEqual(detail.interactions.length, 0);
    strictEqual(detail.contacts.length, 0);
  });

  it("interactions are ordered by created_at DESC", () => {
    const m = meetMember(db, { name: "C", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "old" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "new" });

    const detail = senseMember(db, m.id)!;
    strictEqual(detail.interactions[0].summary, "new");
    strictEqual(detail.interactions[1].summary, "old");
  });

  it("contacts are ordered by type then value", () => {
    const m = meetMember(db, { name: "D", kind: "human" });
    addContact(db, { memberId: m.id, type: "telegram", value: "99" });
    addContact(db, { memberId: m.id, type: "email", value: "d@test.com" });

    const detail = senseMember(db, m.id)!;
    strictEqual(detail.contacts[0].type, "email");
    strictEqual(detail.contacts[1].type, "telegram");
  });

  it("includes fields and links", () => {
    const m = meetMember(db, { name: "E", kind: "human" });
    const org = meetMember(db, { name: "Acme", kind: "group" });
    setField(db, m.id, "client");
    setField(db, m.id, "billing_rate", "100/hr");
    addLink(db, m.id, org.id, "works-at", "CTO");

    const detail = senseMember(db, m.id)!;
    strictEqual(detail.fields.length, 2);
    strictEqual(detail.links.length, 1);
    strictEqual(detail.links[0].label, "works-at");
    strictEqual(detail.links[0].role, "CTO");
  });
});
