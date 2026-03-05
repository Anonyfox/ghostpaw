import { deepStrictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToMember } from "./row_to_member.ts";

describe("rowToMember", () => {
  it("maps a database row to a PackMember", () => {
    const row = {
      id: 1,
      name: "Alice",
      kind: "human",
      bond: "A trusted collaborator.",
      trust: 0.85,
      status: "active",
      first_contact: 1000,
      last_contact: 2000,
      metadata: '{"timezone":"UTC"}',
      created_at: 1000,
      updated_at: 2000,
    };
    deepStrictEqual(rowToMember(row), {
      id: 1,
      name: "Alice",
      kind: "human",
      bond: "A trusted collaborator.",
      trust: 0.85,
      status: "active",
      firstContact: 1000,
      lastContact: 2000,
      metadata: '{"timezone":"UTC"}',
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("handles empty bond and default metadata", () => {
    const row = {
      id: 2,
      name: "Bot",
      kind: "agent",
      bond: "",
      trust: 0.5,
      status: "dormant",
      first_contact: 500,
      last_contact: 500,
      metadata: "{}",
      created_at: 500,
      updated_at: 500,
    };
    const member = rowToMember(row);
    deepStrictEqual(member.bond, "");
    deepStrictEqual(member.metadata, "{}");
    deepStrictEqual(member.status, "dormant");
  });
});
