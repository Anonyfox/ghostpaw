import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { meetMember } from "./meet_member.ts";
import { renderBond } from "./render_bond.ts";
import { initPackTables } from "./schema.ts";
import { updateBond } from "./update_bond.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("renderBond", () => {
  it("renders a bond as markdown", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, m.id, { bond: "A trusted partner in code." });

    const md = renderBond(db, m.id);
    ok(md !== null);
    ok(md.includes("## Alice (human)"));
    ok(md.includes("A trusted partner in code."));
    ok(md.includes("Trust: 0.50"));
    ok(md.includes("Status: active"));
  });

  it("returns null when member has no bond", () => {
    const m = meetMember(db, { name: "Bob", kind: "agent" });
    strictEqual(renderBond(db, m.id), null);
  });

  it("returns null for nonexistent member", () => {
    strictEqual(renderBond(db, 999), null);
  });

  it("includes updated trust and status", () => {
    const m = meetMember(db, { name: "Carol", kind: "human" });
    updateBond(db, m.id, { bond: "Evolving.", trust: 0.85, status: "dormant" });

    const md = renderBond(db, m.id)!;
    ok(md.includes("Trust: 0.85"));
    ok(md.includes("Status: dormant"));
  });

  it("includes contacts when present", () => {
    const m = meetMember(db, { name: "Dave", kind: "human" });
    updateBond(db, m.id, { bond: "Good person." });
    addContact(db, { memberId: m.id, type: "email", value: "dave@test.com", label: "work" });
    addContact(db, { memberId: m.id, type: "telegram", value: "12345" });

    const md = renderBond(db, m.id)!;
    ok(md.includes("email:dave@test.com (work)"));
    ok(md.includes("telegram:12345"));
  });

  it("omits contacts line when member has none", () => {
    const m = meetMember(db, { name: "Eve", kind: "human" });
    updateBond(db, m.id, { bond: "New bond." });

    const md = renderBond(db, m.id)!;
    ok(!md.includes("Contacts:"));
  });
});
