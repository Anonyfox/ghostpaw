import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getMemberName } from "./get_member_name.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("getMemberName", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("returns name for existing member", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    strictEqual(getMemberName(db, m.id), "Alice");
  });

  it("returns null for non-existent ID", () => {
    strictEqual(getMemberName(db, 99999), null);
  });
});
