import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { countInteractions } from "./count_interactions.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./runtime/schema.ts";

describe("countInteractions", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initPackTables(db);
  });

  afterEach(() => db.close());

  it("returns 0 for a member with no interactions", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    strictEqual(countInteractions(db, m.id), 0);
  });

  it("counts interactions for a specific member", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "a" });
    noteInteraction(db, { memberId: m.id, kind: "gift", summary: "b" });
    strictEqual(countInteractions(db, m.id), 2);
  });
});
