import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { countMembers } from "./count_members.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("countMembers", () => {
  it("returns all zeros when empty", () => {
    const counts = countMembers(db);
    strictEqual(counts.active, 0);
    strictEqual(counts.dormant, 0);
    strictEqual(counts.lost, 0);
    strictEqual(counts.total, 0);
  });

  it("counts members by status", () => {
    meetMember(db, { name: "A", kind: "human" });
    meetMember(db, { name: "B", kind: "human" });
    const c = meetMember(db, { name: "C", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'dormant' WHERE id = ?").run(c.id);

    const counts = countMembers(db);
    strictEqual(counts.active, 2);
    strictEqual(counts.dormant, 1);
    strictEqual(counts.lost, 0);
    strictEqual(counts.total, 3);
  });

  it("counts lost members", () => {
    const m = meetMember(db, { name: "Lost", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(m.id);

    const counts = countMembers(db);
    strictEqual(counts.active, 0);
    strictEqual(counts.lost, 1);
    strictEqual(counts.total, 1);
  });
});
