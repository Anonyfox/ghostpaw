import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  addContact,
  addLink,
  meetMember,
  setField,
  updateBond,
} from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/schema.ts";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { renderPackBond } from "./render_pack_bond.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("renderPackBond", () => {
  it("renders full profile as markdown", () => {
    const member = meetMember(db, { name: "Alice", kind: "human" });
    updateBond(db, member.id, { bond: "A trusted partner in code." });

    const markdown = renderPackBond(db, member.id);
    ok(markdown !== null);
    ok(markdown.includes(`## Alice (human, #${member.id})`));
    ok(markdown.includes("A trusted partner in code."));
    ok(markdown.includes("Trust: 0.50"));
    ok(markdown.includes("Status: active"));
  });

  it("returns profile even when bond is empty", () => {
    const member = meetMember(db, { name: "Bob", kind: "agent" });
    const markdown = renderPackBond(db, member.id);
    ok(markdown !== null);
    ok(markdown.includes("## Bob (agent"));
    ok(markdown.includes("Trust: 0.50"));
  });

  it("returns null for nonexistent member", () => {
    strictEqual(renderPackBond(db, 999), null);
  });

  it("includes updated trust and status", () => {
    const member = meetMember(db, { name: "Carol", kind: "human" });
    updateBond(db, member.id, { bond: "Evolving.", trust: 0.85, status: "dormant" });

    const markdown = renderPackBond(db, member.id);
    ok(markdown?.includes("Trust: 0.85"));
    ok(markdown?.includes("Status: dormant"));
  });

  it("includes contacts when present", () => {
    const member = meetMember(db, { name: "Dave", kind: "human" });
    addContact(db, { memberId: member.id, type: "email", value: "dave@test.com", label: "work" });
    addContact(db, { memberId: member.id, type: "telegram", value: "12345" });

    const markdown = renderPackBond(db, member.id);
    ok(markdown?.includes("### Contacts"));
    ok(markdown?.includes("email: dave@test.com (work)"));
    ok(markdown?.includes("telegram: 12345"));
  });

  it("omits contacts section when member has none", () => {
    const member = meetMember(db, { name: "Eve", kind: "human" });
    const markdown = renderPackBond(db, member.id);
    ok(!markdown?.includes("### Contacts"));
  });

  it("includes universal columns", () => {
    const member = meetMember(db, {
      name: "Faye",
      kind: "human",
      nickname: "F",
      timezone: "Europe/Berlin",
      pronouns: "she/her",
    });
    const markdown = renderPackBond(db, member.id);
    ok(markdown?.includes('"F"'));
    ok(markdown?.includes("Timezone: Europe/Berlin"));
    ok(markdown?.includes("Pronouns: she/her"));
  });

  it("includes tags and fields", () => {
    const member = meetMember(db, { name: "Gabe", kind: "human" });
    setField(db, member.id, "client");
    setField(db, member.id, "billing_rate", "100/hr");

    const markdown = renderPackBond(db, member.id);
    ok(markdown?.includes("Tags: client"));
    ok(markdown?.includes("billing_rate: 100/hr"));
  });

  it("includes links with target names", () => {
    const member = meetMember(db, { name: "Hana", kind: "human" });
    const org = meetMember(db, { name: "Acme", kind: "group" });
    addLink(db, member.id, org.id, "works-at", "CTO");

    const markdown = renderPackBond(db, member.id);
    ok(markdown?.includes("### Links"));
    ok(markdown?.includes("works-at"));
    ok(markdown?.includes("Acme"));
    ok(markdown?.includes("CTO"));
  });

  it("includes parent name", () => {
    const parent = meetMember(db, { name: "BigCo", kind: "group" });
    const child = meetMember(db, { name: "SubCo", kind: "group", parentId: parent.id });

    const markdown = renderPackBond(db, child.id);
    ok(markdown?.includes("Parent: BigCo"));
  });
});
