import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { getMemberByName } from "./get_member_by_name.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("getMemberByName", () => {
  it("finds an active member by name", () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const found = getMemberByName(db, "Alice");
    strictEqual(found?.name, "Alice");
  });

  it("finds a dormant member by name", () => {
    const created = meetMember(db, { name: "Bob", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'dormant' WHERE id = ?").run(created.id);
    const found = getMemberByName(db, "Bob");
    strictEqual(found?.status, "dormant");
  });

  it("does not find a lost member", () => {
    const created = meetMember(db, { name: "Carol", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(created.id);
    strictEqual(getMemberByName(db, "Carol"), null);
  });

  it("returns null for nonexistent name", () => {
    strictEqual(getMemberByName(db, "Nobody"), null);
  });

  it("returns null for empty string", () => {
    strictEqual(getMemberByName(db, ""), null);
  });

  it("returns null for whitespace-only input", () => {
    strictEqual(getMemberByName(db, "   "), null);
  });

  it("trims input before searching", () => {
    meetMember(db, { name: "Dan", kind: "agent" });
    const found = getMemberByName(db, "  Dan  ");
    strictEqual(found?.name, "Dan");
  });
});
