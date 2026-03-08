import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addContact, initPackTables, meetMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createContactListTool } from "./contact_list.ts";

describe("contact_list tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createContactListTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("lists contacts for a member", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: m.id, type: "email", value: "a@b.com" });
    addContact(db, { memberId: m.id, type: "phone", value: "+1234" });

    const result = (await execute({ member: "Alice" })) as {
      contacts: { type: string; value: string }[];
    };
    strictEqual(result.contacts.length, 2);
  });

  it("filters by type", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: m.id, type: "email", value: "a@b.com" });
    addContact(db, { memberId: m.id, type: "phone", value: "+1234" });

    const result = (await execute({ member: "Alice", type: "email" })) as {
      contacts: { type: string }[];
    };
    strictEqual(result.contacts.length, 1);
    strictEqual(result.contacts[0].type, "email");
  });

  it("returns error for unknown member", async () => {
    const result = (await execute({ member: "Ghost" })) as { error: string };
    ok(result.error.includes("not found"));
  });
});
