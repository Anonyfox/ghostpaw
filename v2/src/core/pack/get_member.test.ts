import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { getMember } from "./get_member.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("getMember", () => {
  it("returns a member by ID", () => {
    const created = meetMember(db, { name: "Alice", kind: "human" });
    const found = getMember(db, created.id);
    strictEqual(found?.id, created.id);
    strictEqual(found?.name, "Alice");
  });

  it("returns null for nonexistent ID", () => {
    strictEqual(getMember(db, 999), null);
  });

  it("returns members regardless of status", () => {
    const created = meetMember(db, { name: "Bob", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(created.id);
    const found = getMember(db, created.id);
    strictEqual(found?.status, "lost");
  });
});
