import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables, meetMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackBondTool } from "./bond.ts";
import type { FormattedMemberDetail } from "./types.ts";

describe("pack_bond tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackBondTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("updates trust and returns changes", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", trust: 0.85 })) as {
      member: FormattedMemberDetail;
      changes: string[];
    };
    strictEqual(result.member.trust, 0.85);
    ok(result.changes.some((c) => c.includes("trust")));
  });

  it("updates bond narrative", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", bond: "Now a close ally." })) as {
      member: FormattedMemberDetail;
      changes: string[];
    };
    strictEqual(result.member.bond, "Now a close ally.");
    ok(result.changes.includes("bond updated"));
  });

  it("updates status", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", status: "dormant" })) as {
      member: FormattedMemberDetail;
      changes: string[];
    };
    strictEqual(result.member.status, "dormant");
    ok(result.changes.some((c) => c.includes("dormant")));
  });

  it("renames a member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", name: "Alice W." })) as {
      member: FormattedMemberDetail;
      changes: string[];
    };
    strictEqual(result.member.name, "Alice W.");
    ok(result.changes.some((c) => c.includes("name")));
  });

  it("resolves by ID", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: String(m.id), trust: 0.9 })) as {
      member: FormattedMemberDetail;
    };
    strictEqual(result.member.trust, 0.9);
  });

  it("returns error when member not found", async () => {
    const result = (await execute({ member: "Ghost", trust: 0.5 })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error when no changes provided", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice" })) as { error: string };
    ok(result.error.includes("No changes"));
  });

  it("returns error for empty member ref", async () => {
    const result = (await execute({ member: "" })) as { error: string };
    ok(result.error.includes("empty"));
  });

  it("clamps trust to 0-1 range", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", trust: 1.5 })) as {
      member: FormattedMemberDetail;
    };
    strictEqual(result.member.trust, 1);
  });

  it("has a name and description", () => {
    const tool = createPackBondTool(db);
    strictEqual(tool.name, "pack_bond");
    ok(tool.description.length > 20);
  });
});
