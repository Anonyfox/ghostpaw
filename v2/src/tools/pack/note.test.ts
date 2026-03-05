import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables, meetMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackNoteTool } from "./note.ts";
import type { FormattedInteraction } from "./types.ts";

describe("pack_note tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackNoteTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("records an interaction with defaults", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: "Alice",
      summary: "Discussed architecture.",
    })) as { interaction: FormattedInteraction; member_interactions: number };

    strictEqual(result.interaction.kind, "conversation");
    strictEqual(result.interaction.significance, 0.5);
    ok(result.interaction.summary.includes("architecture"));
    strictEqual(result.member_interactions, 1);
  });

  it("records with custom kind and significance", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: "Alice",
      summary: "Reached v1.0 together.",
      kind: "milestone",
      significance: 0.95,
    })) as { interaction: FormattedInteraction; member_interactions: number };

    strictEqual(result.interaction.kind, "milestone");
    strictEqual(result.interaction.significance, 0.95);
  });

  it("increments interaction count", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    await execute({ member: "Alice", summary: "First chat." });
    const result = (await execute({ member: "Alice", summary: "Second chat." })) as {
      member_interactions: number;
    };
    strictEqual(result.member_interactions, 2);
  });

  it("resolves by ID", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: String(m.id),
      summary: "Quick sync.",
    })) as { interaction: FormattedInteraction };
    ok(result.interaction.id > 0);
  });

  it("returns error for unknown member", async () => {
    const result = (await execute({ member: "Ghost", summary: "Hello." })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for empty summary", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ member: "Alice", summary: "" })) as { error: string };
    ok(result.error.includes("empty"));
  });

  it("returns error for empty member ref", async () => {
    const result = (await execute({ member: "", summary: "Hello." })) as { error: string };
    ok(result.error.includes("empty"));
  });

  it("clamps significance to 0-1 range", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({
      member: "Alice",
      summary: "Edge case.",
      significance: 5.0,
    })) as { interaction: FormattedInteraction };
    strictEqual(result.interaction.significance, 1);
  });

  it("has a name and description", () => {
    const tool = createPackNoteTool(db);
    strictEqual(tool.name, "pack_note");
    ok(tool.description.length > 20);
  });
});
