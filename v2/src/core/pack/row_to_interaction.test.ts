import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToInteraction } from "./row_to_interaction.ts";

describe("rowToInteraction", () => {
  it("maps a database row to a PackInteraction", () => {
    const row = {
      id: 1,
      member_id: 5,
      kind: "correction",
      summary: "Pointed out a naming issue.",
      significance: 0.7,
      session_id: 42,
      occurred_at: null,
      created_at: 3000,
    };
    deepStrictEqual(rowToInteraction(row), {
      id: 1,
      memberId: 5,
      kind: "correction",
      summary: "Pointed out a naming issue.",
      significance: 0.7,
      sessionId: 42,
      occurredAt: null,
      createdAt: 3000,
    });
  });

  it("maps null session_id correctly", () => {
    const row = {
      id: 2,
      member_id: 1,
      kind: "observation",
      summary: "Noticed a pattern.",
      significance: 0.3,
      session_id: null,
      created_at: 4000,
    };
    strictEqual(rowToInteraction(row).sessionId, null);
  });

  it("maps non-null occurred_at correctly", () => {
    const row = {
      id: 3,
      member_id: 1,
      kind: "milestone",
      summary: "Opened business.",
      significance: 0.9,
      session_id: null,
      occurred_at: 1700000000000,
      created_at: 1700100000000,
    };
    strictEqual(rowToInteraction(row).occurredAt, 1700000000000);
    strictEqual(rowToInteraction(row).createdAt, 1700100000000);
  });
});
