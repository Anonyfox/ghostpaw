import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addContact, initPackTables, meetMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createContactLookupTool } from "./contact_lookup.ts";

describe("contact_lookup tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createContactLookupTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("finds a member by contact", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    addContact(db, { memberId: m.id, type: "email", value: "alice@test.com" });

    const result = (await execute({ type: "email", value: "alice@test.com" })) as {
      found: boolean;
      member: { name: string };
    };
    strictEqual(result.found, true);
    strictEqual(result.member.name, "Alice");
  });

  it("returns not found for unknown contact", async () => {
    const result = (await execute({ type: "email", value: "nobody@test.com" })) as {
      found: boolean;
    };
    strictEqual(result.found, false);
  });
});
