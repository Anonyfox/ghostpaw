import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initPackTables, meetMember, noteInteraction } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createPackSenseTool } from "./sense.ts";
import type { FormattedMemberDetail, FormattedMemberSummary } from "./types.ts";

describe("pack_sense tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
    const tool = createPackSenseTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("returns empty overview with helpful note", async () => {
    const result = (await execute({})) as {
      members: FormattedMemberSummary[];
      counts: { total: number };
      note: string;
    };
    strictEqual(result.members.length, 0);
    strictEqual(result.counts.total, 0);
    ok(result.note.includes("pack_meet"));
  });

  it("returns overview with members", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Bob", kind: "agent" });

    const result = (await execute({})) as {
      members: FormattedMemberSummary[];
      counts: { active: number; total: number };
    };
    strictEqual(result.members.length, 2);
    strictEqual(result.counts.active, 2);
    strictEqual(result.counts.total, 2);
  });

  it("returns detail by name", async () => {
    meetMember(db, { name: "Alice", kind: "human", bond: "Test bond" });

    const result = (await execute({ member: "Alice" })) as FormattedMemberDetail;
    strictEqual(result.name, "Alice");
    strictEqual(result.bond, "Test bond");
    ok(Array.isArray(result.recent_interactions));
  });

  it("returns detail by ID", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });

    const result = (await execute({ member: String(m.id) })) as FormattedMemberDetail;
    strictEqual(result.id, m.id);
    strictEqual(result.name, "Alice");
  });

  it("includes interactions in detail", async () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    noteInteraction(db, {
      memberId: m.id,
      kind: "conversation",
      summary: "Talked about weather.",
    });

    const result = (await execute({ member: "Alice" })) as FormattedMemberDetail;
    strictEqual(result.recent_interactions.length, 1);
    ok(result.recent_interactions[0].summary.includes("weather"));
  });

  it("returns error for unknown member", async () => {
    const result = (await execute({ member: "Ghost" })) as { error: string };
    ok(result.error.includes("not found"));
    ok(result.error.includes("pack_sense"));
  });

  it("has a name and description", () => {
    const tool = createPackSenseTool(db);
    strictEqual(tool.name, "pack_sense");
    ok(tool.description.length > 20);
  });
});
