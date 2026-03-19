import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { listContacts } from "../../core/pack/api/read/index.ts";
import { addContact, meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createContactRemoveTool } from "./contact_remove.ts";

describe("contact_remove tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createContactRemoveTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("removes a contact by ID", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const { contact } = addContact(db, { memberId: m.id, type: "email", value: "a@b.com" });

    const result = (await execute({ contact_id: contact.id })) as { removed: boolean };
    strictEqual(result.removed, true);
    strictEqual(listContacts(db, m.id).length, 0);
  });

  it("returns error for non-existent contact", async () => {
    const result = (await execute({ contact_id: 99999 })) as { error: string };
    ok(result.error.includes("not found"));
  });
});
