import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getMemberBonds } from "./get_member_bonds.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("getMemberBonds", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("batch-fetches bonds for multiple members", () => {
    const a = meetMember(db, { name: "Alice", kind: "human", bond: "ally" });
    const b = meetMember(db, { name: "Bob", kind: "human", bond: "friend" });
    const map = getMemberBonds(db, [a.id, b.id]);
    strictEqual(map.get(a.id), "ally");
    strictEqual(map.get(b.id), "friend");
  });

  it("returns empty map for empty input", () => {
    strictEqual(getMemberBonds(db, []).size, 0);
  });
});
