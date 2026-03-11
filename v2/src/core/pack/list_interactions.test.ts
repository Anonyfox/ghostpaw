import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { listInteractions } from "./list_interactions.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("listInteractions", () => {
  it("returns an empty array when no interactions exist", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    strictEqual(listInteractions(db, m.id).length, 0);
  });

  it("returns interactions ordered by created_at DESC", () => {
    const m = meetMember(db, { name: "Bob", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "First" });
    noteInteraction(db, { memberId: m.id, kind: "milestone", summary: "Second" });

    const list = listInteractions(db, m.id);
    strictEqual(list.length, 2);
    strictEqual(list[0].summary, "Second");
    strictEqual(list[1].summary, "First");
  });

  it("filters by kind", () => {
    const m = meetMember(db, { name: "C", kind: "human" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "a" });
    noteInteraction(db, { memberId: m.id, kind: "gift", summary: "b" });
    noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "c" });

    const convos = listInteractions(db, m.id, { kind: "conversation" });
    strictEqual(convos.length, 2);
  });

  it("respects limit and offset", () => {
    const m = meetMember(db, { name: "D", kind: "human" });
    for (let i = 0; i < 10; i++) {
      noteInteraction(db, { memberId: m.id, kind: "observation", summary: `n${i}` });
    }

    const page = listInteractions(db, m.id, { limit: 3, offset: 2 });
    strictEqual(page.length, 3);
  });

  it("returns empty for nonexistent member", () => {
    strictEqual(listInteractions(db, 999).length, 0);
  });

  it("does not return interactions from other members", () => {
    const a = meetMember(db, { name: "A", kind: "human" });
    const b = meetMember(db, { name: "B", kind: "human" });
    noteInteraction(db, { memberId: a.id, kind: "conversation", summary: "for A" });
    noteInteraction(db, { memberId: b.id, kind: "conversation", summary: "for B" });

    const aList = listInteractions(db, a.id);
    strictEqual(aList.length, 1);
    strictEqual(aList[0].summary, "for A");
  });
});
