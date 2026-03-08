import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { addContact } from "./add_contact.ts";
import { setField } from "./fields.ts";
import { addLink } from "./links.ts";
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
  it("renders full profile as markdown", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, m.id, { bond: "A trusted partner in code." });

    const md = renderBond(db, m.id);
    ok(md !== null);
    ok(md.includes(`## Alice (human, #${m.id})`));
    ok(md.includes("A trusted partner in code."));
    ok(md.includes("Trust: 0.50"));
    ok(md.includes("Status: active"));
  });

  it("returns profile even when bond is empty", () => {
    const m = meetMember(db, { name: "Bob", kind: "agent" });
    const md = renderBond(db, m.id);
    ok(md !== null);
    ok(md.includes("## Bob (agent"));
    ok(md.includes("Trust: 0.50"));
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
    addContact(db, { memberId: m.id, type: "email", value: "dave@test.com", label: "work" });
    addContact(db, { memberId: m.id, type: "telegram", value: "12345" });

    const md = renderBond(db, m.id)!;
    ok(md.includes("### Contacts"));
    ok(md.includes("email: dave@test.com (work)"));
    ok(md.includes("telegram: 12345"));
  });

  it("omits contacts section when member has none", () => {
    const m = meetMember(db, { name: "Eve", kind: "human" });
    const md = renderBond(db, m.id)!;
    ok(!md.includes("### Contacts"));
  });

  it("includes universal columns", () => {
    const m = meetMember(db, {
      name: "Faye",
      kind: "human",
      nickname: "F",
      timezone: "Europe/Berlin",
      pronouns: "she/her",
    });
    const md = renderBond(db, m.id)!;
    ok(md.includes('"F"'));
    ok(md.includes("Timezone: Europe/Berlin"));
    ok(md.includes("Pronouns: she/her"));
  });

  it("includes tags and fields", () => {
    const m = meetMember(db, { name: "Gabe", kind: "human" });
    setField(db, m.id, "client");
    setField(db, m.id, "billing_rate", "100/hr");

    const md = renderBond(db, m.id)!;
    ok(md.includes("Tags: client"));
    ok(md.includes("billing_rate: 100/hr"));
  });

  it("includes links with target names", () => {
    const m = meetMember(db, { name: "Hana", kind: "human" });
    const org = meetMember(db, { name: "Acme", kind: "group" });
    addLink(db, m.id, org.id, "works-at", "CTO");

    const md = renderBond(db, m.id)!;
    ok(md.includes("### Links"));
    ok(md.includes("works-at"));
    ok(md.includes("Acme"));
    ok(md.includes("CTO"));
  });

  it("includes parent name", () => {
    const parent = meetMember(db, { name: "BigCo", kind: "group" });
    const child = meetMember(db, { name: "SubCo", kind: "group", parentId: parent.id });

    const md = renderBond(db, child.id)!;
    ok(md.includes("Parent: BigCo"));
  });
});
