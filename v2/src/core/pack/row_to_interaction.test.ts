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
      created_at: 3000,
    };
    deepStrictEqual(rowToInteraction(row), {
      id: 1,
      memberId: 5,
      kind: "correction",
      summary: "Pointed out a naming issue.",
      significance: 0.7,
      sessionId: 42,
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
});
