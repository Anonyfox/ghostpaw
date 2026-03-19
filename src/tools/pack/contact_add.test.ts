import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addContact, meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createContactAddTool } from "./contact_add.ts";

describe("contact_add tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createContactAddTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("adds a contact and returns it", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: "Alice",
      type: "email",
      value: "alice@example.com",
      label: "work",
    })) as { added: { type: string; value: string; label: string } };
    strictEqual(result.added.type, "email");
    strictEqual(result.added.value, "alice@example.com");
    strictEqual(result.added.label, "work");
  });

  it("returns conflict when contact belongs to another member", async () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Bob", kind: "human" });
    addContact(db, { memberId: a.id, type: "email", value: "shared@example.com" });

    const result = (await execute({
      member: "Bob",
      type: "email",
      value: "shared@example.com",
    })) as { conflict: boolean; existing_member_id: number };
    strictEqual(result.conflict, true);
    strictEqual(result.existing_member_id, a.id);
  });

  it("returns error for unknown member", async () => {
    const result = (await execute({
      member: "Ghost",
      type: "email",
      value: "x@y.com",
    })) as { error: string };
    ok(result.error.includes("not found"));
  });
});
