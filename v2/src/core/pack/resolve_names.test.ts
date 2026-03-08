import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { resolveNames } from "./resolve_names.ts";
import { initPackTables } from "./schema.ts";

describe("resolveNames", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("resolves multiple IDs to names in a single batch", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const b = meetMember(db, { name: "Bob", kind: "human" });
    const map = resolveNames(db, [a.id, b.id]);
    strictEqual(map.get(a.id), "Alice");
    strictEqual(map.get(b.id), "Bob");
  });

  it("returns empty map for empty input", () => {
    const map = resolveNames(db, []);
    strictEqual(map.size, 0);
  });

  it("skips non-existent IDs", () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    const map = resolveNames(db, [a.id, 99999]);
    strictEqual(map.size, 1);
    strictEqual(map.has(99999), false);
  });
});
