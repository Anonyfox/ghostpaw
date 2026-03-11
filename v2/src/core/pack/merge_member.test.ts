import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { setField } from "./fields.ts";
import { getMember } from "./get_member.ts";
import { addLink } from "./links.ts";
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

  it("rejects merging into a lost member", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(keep.id);

    throws(() => mergeMember(db, keep.id, merge.id), /is lost/);
  });

  it("preserves kept member bond when merged member has empty bond", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human", bond: "Original." });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.bond, "Original.");
  });

  it("migrates fields from merged member to survivor", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    setField(db, keep.id, "client");
    setField(db, merge.id, "vip");
    setField(db, merge.id, "client");

    mergeMember(db, keep.id, merge.id);

    const fields = db
      .prepare("SELECT key FROM pack_fields WHERE member_id = ? ORDER BY key")
      .all(keep.id) as { key: string }[];
    strictEqual(fields.length, 2);
    strictEqual(fields[0].key, "client");
    strictEqual(fields[1].key, "vip");

    const mergedFields = db
      .prepare("SELECT key FROM pack_fields WHERE member_id = ?")
      .all(merge.id) as { key: string }[];
    strictEqual(mergedFields.length, 0);
  });

  it("migrates links from merged member to survivor", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    const org = meetMember(db, { name: "Acme", kind: "group" });
    addLink(db, merge.id, org.id, "works-at");

    mergeMember(db, keep.id, merge.id);

    const links = db
      .prepare("SELECT member_id, label FROM pack_links WHERE member_id = ?")
      .all(keep.id) as { member_id: number; label: string }[];
    strictEqual(links.length, 1);
    strictEqual(links[0].label, "works-at");
  });

  it("preserves canonical member fields from the merged member when survivor lacks them", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, {
      name: "Alexander",
      kind: "human",
      nickname: "Alex",
      timezone: "Europe/Berlin",
      locale: "de-DE",
      location: "Berlin",
      address: "Example Street 1",
      pronouns: "he/him",
      birthday: "1990-03-18",
    });

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.nickname, "Alex");
    strictEqual(result.timezone, "Europe/Berlin");
    strictEqual(result.locale, "de-DE");
    strictEqual(result.location, "Berlin");
    strictEqual(result.address, "Example Street 1");
    strictEqual(result.pronouns, "he/him");
    strictEqual(result.birthday, "1990-03-18");
  });

  it("keeps survivor canonical fields when merged member has null values", () => {
    const keep = meetMember(db, {
      name: "Alice",
      kind: "human",
      nickname: "Al",
      timezone: "UTC",
      locale: "en-US",
      location: "Remote",
      address: "Main Street 1",
      pronouns: "she/her",
      birthday: "1992-01-05",
    });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.nickname, "Al");
    strictEqual(result.timezone, "UTC");
    strictEqual(result.locale, "en-US");
    strictEqual(result.location, "Remote");
    strictEqual(result.address, "Main Street 1");
    strictEqual(result.pronouns, "she/her");
    strictEqual(result.birthday, "1992-01-05");
  });

  it("prefers fresher canonical member fields when both sides have values", () => {
    const keep = meetMember(db, {
      name: "Alice",
      kind: "human",
      timezone: "UTC",
      location: "Old Town",
    });
    const merge = meetMember(db, {
      name: "Alexander",
      kind: "human",
      timezone: "Europe/Berlin",
      location: "Berlin",
    });
    db.prepare("UPDATE pack_members SET updated_at = ? WHERE id = ?").run(100, keep.id);
    db.prepare("UPDATE pack_members SET updated_at = ? WHERE id = ?").run(200, merge.id);

    const result = mergeMember(db, keep.id, merge.id);
    strictEqual(result.timezone, "Europe/Berlin");
    strictEqual(result.location, "Berlin");
  });

  it("merges conflicting field values by preferring the fresher entry", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    setField(db, keep.id, "billing_rate", "100/hr");
    setField(db, merge.id, "billing_rate", "150/hr");
    db.prepare("UPDATE pack_fields SET updated_at = ? WHERE member_id = ? AND key = ?").run(
      100,
      keep.id,
      "billing_rate",
    );
    db.prepare("UPDATE pack_fields SET updated_at = ? WHERE member_id = ? AND key = ?").run(
      200,
      merge.id,
      "billing_rate",
    );

    mergeMember(db, keep.id, merge.id);

    const row = db
      .prepare("SELECT value FROM pack_fields WHERE member_id = ? AND key = ?")
      .get(keep.id, "billing_rate") as { value: string };
    strictEqual(row.value, "150/hr");
  });

  it("reparents child members pointing at the merged member", () => {
    const keep = meetMember(db, { name: "Acme", kind: "group" });
    const merge = meetMember(db, { name: "Acme Europe", kind: "group" });
    const child = meetMember(db, {
      name: "Backend Team",
      kind: "group",
      parentId: merge.id,
    });

    mergeMember(db, keep.id, merge.id);

    const updatedChild = getMember(db, child.id);
    strictEqual(updatedChild?.parentId, keep.id);
  });

  it("reparents incoming links and removes collisions safely", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    const other = meetMember(db, { name: "Manager", kind: "human" });
    addLink(db, other.id, keep.id, "manages");
    addLink(db, other.id, merge.id, "manages");

    mergeMember(db, keep.id, merge.id);

    const links = db
      .prepare(
        "SELECT member_id, target_id, label FROM pack_links WHERE member_id = ? ORDER BY target_id, label",
      )
      .all(other.id) as { member_id: number; target_id: number; label: string }[];
    strictEqual(links.length, 1);
    strictEqual(links[0].target_id, keep.id);
    strictEqual(links[0].label, "manages");
  });

  it("removes self-links created by merge reparenting", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    addLink(db, keep.id, merge.id, "knows");
    addLink(db, merge.id, keep.id, "knows");

    mergeMember(db, keep.id, merge.id);

    const links = db
      .prepare("SELECT COUNT(*) AS count FROM pack_links WHERE member_id = ? OR target_id = ?")
      .get(keep.id, keep.id) as { count: number };
    strictEqual(links.count, 0);
  });

  it("rolls back the merge when a later step fails", () => {
    const keep = meetMember(db, { name: "Alice", kind: "human" });
    const merge = meetMember(db, { name: "Alexander", kind: "human" });
    noteInteraction(db, { memberId: merge.id, kind: "conversation", summary: "talked" });
    addContact(db, { memberId: merge.id, type: "email", value: "alex@example.com" });
    db.exec(`
      CREATE TRIGGER abort_pack_member_update
      BEFORE UPDATE OF first_contact ON pack_members
      WHEN NEW.id = ${keep.id}
      BEGIN
        SELECT RAISE(ABORT, 'boom');
      END;
    `);

    throws(() => mergeMember(db, keep.id, merge.id), /boom/);

    const interactionRows = db
      .prepare("SELECT member_id FROM pack_interactions ORDER BY id")
      .all() as { member_id: number }[];
    strictEqual(interactionRows.length, 1);
    strictEqual(interactionRows[0].member_id, merge.id);

    const contactRows = db
      .prepare("SELECT member_id FROM pack_contacts ORDER BY id")
      .all() as { member_id: number }[];
    strictEqual(contactRows.length, 1);
    strictEqual(contactRows[0].member_id, merge.id);

    const keepAfter = getMember(db, keep.id);
    const mergeAfter = getMember(db, merge.id);
    strictEqual(keepAfter?.status, "active");
    strictEqual(mergeAfter?.status, "active");
  });
});
