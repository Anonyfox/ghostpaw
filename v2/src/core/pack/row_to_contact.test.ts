import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToContact } from "./row_to_contact.ts";

describe("rowToContact", () => {
  it("maps a database row to a PackContact", () => {
    const row = {
      id: 1,
      member_id: 5,
      type: "email",
      value: "alice@example.com",
      label: "work",
      created_at: 3000,
    };
    deepStrictEqual(rowToContact(row), {
      id: 1,
      memberId: 5,
      type: "email",
      value: "alice@example.com",
      label: "work",
      createdAt: 3000,
    });
  });

  it("maps null label correctly", () => {
    const row = {
      id: 2,
      member_id: 1,
      type: "telegram",
      value: "12345",
      label: null,
      created_at: 4000,
    };
    strictEqual(rowToContact(row).label, null);
  });
});
