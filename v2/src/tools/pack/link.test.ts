import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables, meetMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackLinkTool } from "./link.ts";

describe("pack_link tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackLinkTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("adds a link between two members", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Acme", kind: "group" });
    const result = (await execute({
      action: "add",
      member: "Alice",
      target: "Acme",
      label: "works-at",
      role: "CTO",
    })) as { link: { source: string; target: string; label: string; role: string } };
    strictEqual(result.link.source, "Alice");
    strictEqual(result.link.target, "Acme");
    strictEqual(result.link.label, "works-at");
    strictEqual(result.link.role, "CTO");
  });

  it("removes a link", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Acme", kind: "group" });
    await execute({ action: "add", member: "Alice", target: "Acme", label: "works-at" });
    const result = (await execute({
      action: "remove",
      member: "Alice",
      target: "Acme",
      label: "works-at",
    })) as { removed: boolean };
    strictEqual(result.removed, true);
  });

  it("lists links for a member", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Acme", kind: "group" });
    await execute({ action: "add", member: "Alice", target: "Acme", label: "works-at" });
    const result = (await execute({ action: "list", member: "Alice" })) as {
      outgoing: { target: string; label: string }[];
      incoming: { source: string; label: string }[];
    };
    strictEqual(result.outgoing.length, 1);
    strictEqual(result.outgoing[0].label, "works-at");
  });

  it("deactivates a link (marks as former)", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Acme", kind: "group" });
    await execute({ action: "add", member: "Alice", target: "Acme", label: "works-at" });
    const result = (await execute({
      action: "deactivate",
      member: "Alice",
      target: "Acme",
      label: "works-at",
    })) as { deactivated: boolean };
    strictEqual(result.deactivated, true);

    const listed = (await execute({ action: "list", member: "Alice" })) as {
      outgoing: { label: string; active: boolean }[];
    };
    strictEqual(listed.outgoing.length, 1);
    strictEqual(listed.outgoing[0].active, false);
  });

  it("returns error for unknown member", async () => {
    const result = (await execute({
      action: "add",
      member: "Ghost",
      target: "X",
      label: "y",
    })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for missing target on add", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      action: "add",
      member: "Alice",
      label: "works-at",
    })) as { error: string };
    ok(result.error.includes("required"));
  });

  it("has a name and description", () => {
    const tool = createPackLinkTool(db);
    strictEqual(tool.name, "pack_link");
    ok(tool.description.length > 20);
  });
});
