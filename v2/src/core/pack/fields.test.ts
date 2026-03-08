import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { findMembersByField, listFields, removeField, setField } from "./fields.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("setField", () => {
  it("sets a tag (value omitted)", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const f = setField(db, m.id, "client");
    strictEqual(f.key, "client");
    strictEqual(f.value, null);
  });

  it("sets a keyed field", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const f = setField(db, m.id, "billing_rate", "150/hr EUR");
    strictEqual(f.key, "billing_rate");
    strictEqual(f.value, "150/hr EUR");
  });

  it("upserts on conflict", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    setField(db, m.id, "billing_rate", "100/hr");
    const f = setField(db, m.id, "billing_rate", "150/hr");
    strictEqual(f.value, "150/hr");
    const all = listFields(db, m.id);
    strictEqual(all.length, 1);
  });

  it("normalizes key to lowercase trimmed", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const f = setField(db, m.id, "  VIP  ");
    strictEqual(f.key, "vip");
  });

  it("throws on empty key", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    throws(() => setField(db, m.id, ""), /non-empty/);
  });
});

describe("removeField", () => {
  it("removes a field", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    setField(db, m.id, "client");
    removeField(db, m.id, "client");
    strictEqual(listFields(db, m.id).length, 0);
  });

  it("is a no-op for non-existent key", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    removeField(db, m.id, "nope");
    strictEqual(listFields(db, m.id).length, 0);
  });
});

describe("listFields", () => {
  it("returns tags and fields sorted by key", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    setField(db, m.id, "vip");
    setField(db, m.id, "client");
    setField(db, m.id, "billing_rate", "100/hr");
    const fields = listFields(db, m.id);
    strictEqual(fields.length, 3);
    deepStrictEqual(
      fields.map((f) => f.key),
      ["billing_rate", "client", "vip"],
    );
  });
});

describe("findMembersByField", () => {
  it("finds members by tag", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    meetMember(db, { name: "Carol", kind: "human" });
    setField(db, a.id, "client");
    setField(db, b.id, "client");
    const found = findMembersByField(db, "client");
    strictEqual(found.length, 2);
  });

  it("finds members by key+value", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    setField(db, a.id, "source", "conference");
    setField(db, b.id, "source", "referral");
    const found = findMembersByField(db, "source", "conference");
    strictEqual(found.length, 1);
    strictEqual(found[0].name, "Alice");
  });
});
