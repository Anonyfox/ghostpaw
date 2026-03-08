import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { setField } from "./fields.ts";
import { getMemberTags } from "./get_member_tags.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";

describe("getMemberTags", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("batch-fetches tags (fields with null value) for multiple members", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    setField(db, a.id, "vip");
    setField(db, a.id, "client");
    setField(db, a.id, "billing_rate", "150"); // keyed field, not a tag
    setField(db, b.id, "friend");

    const map = getMemberTags(db, [a.id, b.id]);
    deepStrictEqual(map.get(a.id), ["client", "vip"]);
    deepStrictEqual(map.get(b.id), ["friend"]);
  });

  it("returns empty map for empty input", () => {
    strictEqual(getMemberTags(db, []).size, 0);
  });

  it("omits members with no tags", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    setField(db, a.id, "billing_rate", "100");
    const map = getMemberTags(db, [a.id]);
    strictEqual(map.has(a.id), false);
  });
});
