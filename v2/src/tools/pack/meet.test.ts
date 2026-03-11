import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackMeetTool } from "./meet.ts";
import type { FormattedMemberSummary } from "./types.ts";

describe("pack_meet tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackMeetTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("creates a new member with defaults", async () => {
    const result = (await execute({ name: "Alice" })) as { member: FormattedMemberSummary };
    strictEqual(result.member.name, "Alice");
    strictEqual(result.member.kind, "human");
    strictEqual(result.member.status, "active");
    strictEqual(result.member.trust, 0.5);
    strictEqual(result.member.interactions, 0);
  });

  it("creates a member with kind and bond", async () => {
    const result = (await execute({
      name: "Claude",
      kind: "agent",
      bond: "My AI assistant.",
    })) as { member: FormattedMemberSummary };
    strictEqual(result.member.kind, "agent");
    ok(result.member.bond_excerpt.includes("AI assistant"));
  });

  it("returns error for duplicate name", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ name: "Alice" })) as { error: string };
    ok(result.error.includes("already exists"));
    ok(result.error.includes("pack_bond"));
  });

  it("returns error for empty name", async () => {
    const result = (await execute({ name: "" })) as { error: string };
    ok(result.error.includes("empty"));
  });

  it("returns error for whitespace-only name", async () => {
    const result = (await execute({ name: "   " })) as { error: string };
    ok(result.error.includes("empty"));
  });

  it("has a name and description", () => {
    const tool = createPackMeetTool(db);
    strictEqual(tool.name, "pack_meet");
    ok(tool.description.length > 20);
  });
});
