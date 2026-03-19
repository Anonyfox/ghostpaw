import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToMember } from "./internal/rows/row_to_member.ts";

describe("rowToMember", () => {
  it("maps a database row to a PackMember", () => {
    const row = {
      id: 1,
      name: "Alice",
      nickname: "Ali",
      kind: "human",
      bond: "A trusted collaborator.",
      trust: 0.85,
      status: "active",
      is_user: 1,
      parent_id: null,
      timezone: "Europe/Berlin",
      locale: "de-DE",
      location: "Berlin",
      address: "123 Main St",
      pronouns: "she/her",
      birthday: "1990-05-15",
      first_contact: 1000,
      last_contact: 2000,
      created_at: 1000,
      updated_at: 2000,
    };
    deepStrictEqual(rowToMember(row), {
      id: 1,
      name: "Alice",
      nickname: "Ali",
      kind: "human",
      bond: "A trusted collaborator.",
      trust: 0.85,
      status: "active",
      isUser: true,
      parentId: null,
      timezone: "Europe/Berlin",
      locale: "de-DE",
      location: "Berlin",
      address: "123 Main St",
      pronouns: "she/her",
      birthday: "1990-05-15",
      firstContact: 1000,
      lastContact: 2000,
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it("maps is_user=0 to false and handles null universals", () => {
    const row = {
      id: 2,
      name: "Bot",
      nickname: null,
      kind: "agent",
      bond: "",
      trust: 0.5,
      status: "dormant",
      is_user: 0,
      parent_id: null,
      timezone: null,
      locale: null,
      location: null,
      address: null,
      pronouns: null,
      birthday: null,
      first_contact: 500,
      last_contact: 500,
      created_at: 500,
      updated_at: 500,
    };
    const member = rowToMember(row);
    strictEqual(member.isUser, false);
    strictEqual(member.bond, "");
    strictEqual(member.status, "dormant");
    strictEqual(member.nickname, null);
    strictEqual(member.parentId, null);
    strictEqual(member.timezone, null);
  });
});
