import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { meetMember } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackBondTool } from "./bond.ts";

interface BondResult {
  id: number;
  name: string;
  trust: number;
  trust_level: string;
  status: string;
  changes: string[];
}

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

  it("updates trust and returns compact changes", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", trust: 0.85 })) as BondResult;
    strictEqual(result.trust, 0.85);
    ok(result.trust_level);
    ok(result.changes.some((c) => c.includes("trust")));
  });

  it("updates bond narrative", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", bond: "Now a close ally." })) as BondResult;
    ok(result.changes.includes("bond updated"));
  });

  it("updates status", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", status: "dormant" })) as BondResult;
    strictEqual(result.status, "dormant");
    ok(result.changes.some((c) => c.includes("dormant")));
  });

  it("renames a member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", name: "Alice W." })) as BondResult;
    strictEqual(result.name, "Alice W.");
    ok(result.changes.some((c) => c.includes("name")));
  });

  it("resolves by ID", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: String(m.id), trust: 0.9 })) as BondResult;
    strictEqual(result.trust, 0.9);
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
    const result = (await execute({ member: "Alice", trust: 1.5 })) as BondResult;
    strictEqual(result.trust, 1);
  });

  it("batch sets multiple tags and fields", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: "Alice",
      set_field: "vip,client,billing_rate=150/hr EUR",
    })) as BondResult;
    ok(result.changes.some((c) => c.includes("tag set: vip")));
    ok(result.changes.some((c) => c.includes("tag set: client")));
    ok(result.changes.some((c) => c.includes("field set: billing_rate")));
  });

  it("batch removes multiple fields", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    await execute({ member: "Alice", set_field: "vip,client" });
    const result = (await execute({
      member: "Alice",
      remove_field: "vip,client",
    })) as BondResult;
    ok(result.changes.some((c) => c.includes("field removed: vip")));
    ok(result.changes.some((c) => c.includes("field removed: client")));
  });

  it("has a name and description", () => {
    const tool = createPackBondTool(db);
    strictEqual(tool.name, "pack_bond");
    ok(tool.description.length > 20);
  });
});
