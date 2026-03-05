import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./schema.ts";
import { senseMember } from "./sense_member.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("senseMember", () => {
  it("returns member with all interactions", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "First chat." });
    noteInteraction(db, { memberId: m.id, kind: "milestone", summary: "Finished task." });

    const detail = senseMember(db, m.id);
    ok(detail !== null);
    strictEqual(detail.member.name, "Alice");
    strictEqual(detail.interactions.length, 2);
  });

  it("returns null for nonexistent member", () => {
    strictEqual(senseMember(db, 999), null);
  });

  it("returns member with empty interactions when none exist", () => {
    const m = meetMember(db, { name: "Bob", kind: "agent" });
    const detail = senseMember(db, m.id);
    ok(detail !== null);
    strictEqual(detail.interactions.length, 0);
  });

  it("interactions are ordered by created_at DESC", () => {
    const m = meetMember(db, { name: "C", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "old" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "new" });

    const detail = senseMember(db, m.id)!;
    strictEqual(detail.interactions[0].summary, "new");
    strictEqual(detail.interactions[1].summary, "old");
  });
});
