import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { setField } from "./fields.ts";
import { addLink } from "./links.ts";
import { listMembers } from "./list_members.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("listMembers", () => {
  it("returns an empty array when no members exist", () => {
    const result = listMembers(db);
    strictEqual(result.length, 0);
  });

  it("returns all members ordered by last_contact DESC", () => {
    meetMember(db, { name: "First", kind: "human" });
    meetMember(db, { name: "Second", kind: "agent" });
    const result = listMembers(db);
    strictEqual(result.length, 2);
    ok(result[0].lastContact >= result[1].lastContact);
  });

  it("filters by status", () => {
    meetMember(db, { name: "Active", kind: "human" });
    const dormant = meetMember(db, { name: "Dormant", kind: "human" });
    db.prepare("UPDATE pack_members SET status = 'dormant' WHERE id = ?").run(dormant.id);

    const actives = listMembers(db, { status: "active" });
    strictEqual(actives.length, 1);
    strictEqual(actives[0].name, "Active");
  });

  it("filters by kind", () => {
    meetMember(db, { name: "Human", kind: "human" });
    meetMember(db, { name: "Agent", kind: "agent" });

    const agents = listMembers(db, { kind: "agent" });
    strictEqual(agents.length, 1);
    strictEqual(agents[0].name, "Agent");
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      meetMember(db, { name: `M${i}`, kind: "human" });
    }
    const page = listMembers(db, { limit: 2, offset: 2 });
    strictEqual(page.length, 2);
  });

  it("includes interaction count", () => {
    const member = meetMember(db, { name: "Chatty", kind: "human" });
    db.prepare(
      `INSERT INTO pack_interactions (member_id, kind, summary, created_at) VALUES (?, 'conversation', 'test', ?)`,
    ).run(member.id, Date.now());
    db.prepare(
      `INSERT INTO pack_interactions (member_id, kind, summary, created_at) VALUES (?, 'milestone', 'test', ?)`,
    ).run(member.id, Date.now());

    const result = listMembers(db);
    strictEqual(result[0].interactionCount, 2);
  });

  it("returns summary shape with nickname", () => {
    meetMember(db, { name: "Shape", kind: "human", nickname: "S" });
    const result = listMembers(db);
    const keys = Object.keys(result[0]);
    ok(keys.includes("id"));
    ok(keys.includes("name"));
    ok(keys.includes("nickname"));
    ok(keys.includes("kind"));
    ok(keys.includes("trust"));
    ok(keys.includes("status"));
    ok(keys.includes("lastContact"));
    ok(keys.includes("interactionCount"));
    ok(!keys.includes("bond"));
    strictEqual(result[0].nickname, "S");
  });

  it("filters by field tag", () => {
    const a = meetMember(db, { name: "A", kind: "human" });
    meetMember(db, { name: "B", kind: "human" });
    setField(db, a.id, "vip");
    const result = listMembers(db, { field: "vip" });
    strictEqual(result.length, 1);
    strictEqual(result[0].name, "A");
  });

  it("filters by groupId", () => {
    const org = meetMember(db, { name: "Acme", kind: "group" });
    const a = meetMember(db, { name: "A", kind: "human" });
    meetMember(db, { name: "B", kind: "human" });
    addLink(db, a.id, org.id, "works-at");
    const result = listMembers(db, { groupId: org.id });
    strictEqual(result.length, 1);
    strictEqual(result[0].name, "A");
  });

  it("searches by name", () => {
    meetMember(db, { name: "Alice Walker", kind: "human" });
    meetMember(db, { name: "Bob Smith", kind: "human" });
    const result = listMembers(db, { search: "alice" });
    strictEqual(result.length, 1);
    strictEqual(result[0].name, "Alice Walker");
  });

  it("searches by nickname", () => {
    meetMember(db, { name: "Robert", kind: "human", nickname: "Bobby" });
    meetMember(db, { name: "Jane", kind: "human" });
    const result = listMembers(db, { search: "Bobby" });
    strictEqual(result.length, 1);
    strictEqual(result[0].name, "Robert");
  });

  it("searches by field key", () => {
    const a = meetMember(db, { name: "Client", kind: "human" });
    meetMember(db, { name: "Other", kind: "human" });
    setField(db, a.id, "enterprise");
    const result = listMembers(db, { search: "enterprise" });
    strictEqual(result.length, 1);
    strictEqual(result[0].name, "Client");
  });
});
