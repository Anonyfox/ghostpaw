import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { getMember } from "./get_member.ts";
import { listContacts } from "./list_contacts.ts";
import { meetMember } from "./meet_member.ts";
import { mergeMember } from "./merge_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./schema.ts";

describe("mergeMember", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  it("moves interactions from merged member to kept member", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    noteInteraction(db, { memberId: merge.id, kind: "conversation", summary: "talked" });

    mergeMember(db, keep.id, merge.id);

    const rows = db
      .prepare("SELECT member_id FROM pack_interactions WHERE member_id = ?")
      .all(keep.id) as { member_id: number }[];
    strictEqual(rows.length, 1);
    strictEqual(rows[0].member_id, keep.id);
  });

  it("moves contacts from merged member to kept member", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    addContact(db, { memberId: merge.id, type: "telegram", value: "12345" });

    mergeMember(db, keep.id, merge.id);

    const contacts = listContacts(db, keep.id);
    strictEqual(contacts.length, 1);
    strictEqual(contacts[0].type, "telegram");
    strictEqual(contacts[0].value, "12345");
  });

  it("skips conflicting contacts during merge", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    addContact(db, { memberId: keep.id, type: "email", value: "shared@example.com" });
    addContact(db, { memberId: merge.id, type: "email", value: "shared@example.com" });

    mergeMember(db, keep.id, merge.id);

    const contacts = listContacts(db, keep.id);
    strictEqual(contacts.length, 1);
    strictEqual(contacts[0].value, "shared@example.com");
  });

  it("takes the earlier first_contact and later last_contact", () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("Alice", "human", now - 1000, now - 500, now, now);
    db.prepare(
      `INSERT INTO pack_members (name, kind, first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("Alexander", "human", now - 2000, now, now, now);

    const result = mergeMember(db, 1, 2);
    strictEqual(result.firstContact, now - 2000);
    strictEqual(result.lastContact, now);
  });

  it("takes the higher trust value", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    db.prepare("UPDATE pack_members SET trust = ? WHERE id = ?").run(0.3, keep.id);
    db.prepare("UPDATE pack_members SET trust = ? WHERE id = ?").run(0.8, merge.id);

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.trust, 0.8);
  });

  it("appends merged member bond narrative", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human", bond: "Original bond." });
    const merge = meetMember(db, { name: "Alexander", kind: "human", bond: "Merged bond." });

    const result = mergeMember(db, keep.id, merge.id);
    ok(result.bond.includes("Original bond."));
    ok(result.bond.includes("Merged bond."));
    ok(result.bond.includes("merged from Alexander"));
  });

  it("sets merged member status to lost", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });

    mergeMember(db, keep.id, merge.id);

    const merged = getMember(db, merge.id);
    ok(merged !== null);
    strictEqual(merged.status, "lost");
  });

  it("rejects merging a member with itself", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    throws(() => mergeMember(db, member.id, member.id), /Cannot merge a member with itself/);
  });

  it("rejects merging a nonexistent keep member", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    throws(() => mergeMember(db, 999, member.id), /not found/);
  });

  it("rejects merging an already-lost member", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(merge.id);

    throws(() => mergeMember(db, keep.id, merge.id), /already lost/);
  });

  it("preserves kept member bond when merged member has empty bond", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human", bond: "Original." });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.bond, "Original.");
  });
});
