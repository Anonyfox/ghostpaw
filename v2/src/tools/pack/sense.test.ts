import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addLink, meetMember, noteInteraction, setField } from "../../core/pack/api/write/index.ts";
import { initPackTables } from "../../core/pack/runtime/index.ts";
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

  it("filters overview by field tag", async () => {
    const a = meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Bob", kind: "human" });
    setField(db, a.id, "vip");

    const result = (await execute({ field: "vip" })) as {
      members: FormattedMemberSummary[];
    };
    strictEqual(result.members.length, 1);
    strictEqual(result.members[0].name, "Alice");
  });

  it("filters overview by group_id", async () => {
    const acme = meetMember(db, { name: "Acme", kind: "group" });
    const alice = meetMember(db, { name: "Alice", kind: "human" });
    meetMember(db, { name: "Bob", kind: "human" });
    addLink(db, alice.id, acme.id, "works-at");

    const result = (await execute({ group_id: acme.id })) as {
      members: FormattedMemberSummary[];
    };
    strictEqual(result.members.length, 1);
    strictEqual(result.members[0].name, "Alice");
  });

  it("returns note when filter matches nothing", async () => {
    meetMember(db, { name: "Alice", kind: "human" });
    const result = (await execute({ field: "nonexistent" })) as {
      members: FormattedMemberSummary[];
      note: string;
    };
    strictEqual(result.members.length, 0);
    ok(result.note.includes("filter"));
  });

  it("returns patrol digest with compact items", async () => {
    const member = meetMember(db, { name: "Alice", kind: "human", birthday: "1992-03-12" });
    noteInteraction(db, {
      memberId: member.id,
      kind: "conflict",
      summary: "rough patch",
      occurredAt: new Date(2026, 2, 8).getTime(),
    });
    db.prepare("UPDATE pack_members SET trust = ?, last_contact = ? WHERE id = ?").run(
      0.9,
      new Date(2026, 1, 20).getTime(),
      member.id,
    );

    const result = (await execute({ patrol: true })) as {
      patrol: { kind: string; name: string; summary: string }[];
      drift: { threshold_days: number; source: string }[];
    };
    ok(result.patrol.length >= 1);
    ok(result.patrol.some((item) => item.kind === "repair" || item.kind === "landmark"));
    ok(result.drift.every((item) => item.threshold_days > 0));
    ok(result.drift.every((item) => item.source === "fallback" || item.source === "cadence"));
  });

  it("has a name and description", () => {
    const tool = createPackSenseTool(db);
    strictEqual(tool.name, "pack_sense");
    ok(tool.description.length > 20);
  });
});
