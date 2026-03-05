import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { getMember } from "./get_member.ts";
import { meetMember } from "./meet_member.ts";
import { noteInteraction } from "./note_interaction.ts";
import { initPackTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("noteInteraction", () => {
  it("creates an interaction and returns it", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const interaction = noteInteraction(db, {
      memberId: m.id,
      kind: "conversation",
      summary: "Discussed project goals.",
    });
    strictEqual(interaction.memberId, m.id);
    strictEqual(interaction.kind, "conversation");
    strictEqual(interaction.summary, "Discussed project goals.");
    strictEqual(interaction.significance, 0.5);
    strictEqual(interaction.sessionId, null);
    ok(interaction.id > 0);
  });

  it("bumps last_contact on the member", () => {
    const m = meetMember(db, { name: "Bob", kind: "human" });
    const originalLastContact = m.lastContact;

    noteInteraction(db, {
      memberId: m.id,
      kind: "milestone",
      summary: "Completed onboarding.",
    });

    const updated = getMember(db, m.id)!;
    ok(updated.lastContact >= originalLastContact);
  });

  it("stores a custom significance clamped to [0, 1]", () => {
    const m = meetMember(db, { name: "C", kind: "human" });

    strictEqual(
      noteInteraction(db, { memberId: m.id, kind: "gift", summary: "s", significance: 0.9 })
        .significance,
      0.9,
    );
    strictEqual(
      noteInteraction(db, { memberId: m.id, kind: "gift", summary: "s", significance: -1 })
        .significance,
      0,
    );
    strictEqual(
      noteInteraction(db, { memberId: m.id, kind: "gift", summary: "s", significance: 5 })
        .significance,
      1,
    );
  });

  it("links to a session ID when provided", () => {
    const m = meetMember(db, { name: "D", kind: "human" });
    const interaction = noteInteraction(db, {
      memberId: m.id,
      kind: "conversation",
      summary: "Chat.",
      sessionId: 42,
    });
    strictEqual(interaction.sessionId, 42);
  });

  it("trims the summary", () => {
    const m = meetMember(db, { name: "E", kind: "human" });
    const interaction = noteInteraction(db, {
      memberId: m.id,
      kind: "observation",
      summary: "  trimmed  ",
    });
    strictEqual(interaction.summary, "trimmed");
  });

  it("throws on nonexistent member", () => {
    throws(
      () => noteInteraction(db, { memberId: 999, kind: "conversation", summary: "test" }),
      /not found/,
    );
  });

  it("throws on empty summary", () => {
    const m = meetMember(db, { name: "F", kind: "human" });
    throws(
      () => noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "" }),
      /non-empty/,
    );
  });

  it("throws on whitespace-only summary", () => {
    const m = meetMember(db, { name: "G", kind: "human" });
    throws(
      () => noteInteraction(db, { memberId: m.id, kind: "conversation", summary: "   " }),
      /non-empty/,
    );
  });

  it("throws on invalid kind", () => {
    const m = meetMember(db, { name: "H", kind: "human" });
    throws(
      () =>
        noteInteraction(db, {
          memberId: m.id,
          kind: "invalid" as "conversation",
          summary: "test",
        }),
      /Invalid interaction kind/,
    );
  });

  it("throws on invalid memberId", () => {
    throws(
      () => noteInteraction(db, { memberId: 0, kind: "conversation", summary: "test" }),
      /positive integer/,
    );
    throws(
      () => noteInteraction(db, { memberId: -1, kind: "conversation", summary: "test" }),
      /positive integer/,
    );
  });
});
