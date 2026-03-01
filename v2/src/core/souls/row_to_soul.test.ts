import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToSoul } from "./row_to_soul.ts";

describe("rowToSoul", () => {
  it("converts a database row to a Soul", () => {
    const row = {
      id: 1,
      slug: "ghostpaw",
      name: "Ghostpaw",
      essence: "You are the coordinator.",
      description: "The main soul.",
      level: 3,
      created_at: 1000,
      updated_at: 2000,
      deleted_at: null,
    };
    const soul = rowToSoul(row);
    strictEqual(soul.id, 1);
    strictEqual(soul.slug, "ghostpaw");
    strictEqual(soul.name, "Ghostpaw");
    strictEqual(soul.essence, "You are the coordinator.");
    strictEqual(soul.description, "The main soul.");
    strictEqual(soul.level, 3);
    strictEqual(soul.createdAt, 1000);
    strictEqual(soul.updatedAt, 2000);
    strictEqual(soul.deletedAt, null);
  });

  it("handles null slug", () => {
    const row = {
      id: 5,
      slug: null,
      name: "Custom Soul",
      essence: "",
      description: "",
      level: 0,
      created_at: 1000,
      updated_at: 1000,
      deleted_at: null,
    };
    strictEqual(rowToSoul(row).slug, null);
  });

  it("handles empty essence and description", () => {
    const row = {
      id: 5,
      slug: null,
      name: "Empty",
      essence: "",
      description: "",
      level: 0,
      created_at: 1000,
      updated_at: 1000,
      deleted_at: null,
    };
    strictEqual(rowToSoul(row).essence, "");
    strictEqual(rowToSoul(row).description, "");
  });

  it("maps deleted_at timestamp", () => {
    const row = {
      id: 10,
      slug: null,
      name: "Archived",
      essence: "old",
      description: "",
      level: 2,
      created_at: 1000,
      updated_at: 2000,
      deleted_at: 3000,
    };
    strictEqual(rowToSoul(row).deletedAt, 3000);
  });

  it("treats undefined deleted_at as null", () => {
    const row = {
      id: 11,
      slug: null,
      name: "Test",
      essence: "",
      description: "",
      level: 0,
      created_at: 1,
      updated_at: 1,
      deleted_at: undefined,
    };
    strictEqual(rowToSoul(row).deletedAt, null);
  });

  it("defaults missing description to empty string", () => {
    const row = {
      id: 12,
      slug: null,
      name: "No Desc",
      essence: "e",
      level: 0,
      created_at: 1,
      updated_at: 1,
      deleted_at: null,
    };
    strictEqual(rowToSoul(row).description, "");
  });

  it("maps snake_case columns to camelCase fields", () => {
    const row = {
      id: 1,
      slug: "test",
      name: "Test Soul",
      essence: "e",
      description: "d",
      level: 0,
      created_at: 100,
      updated_at: 200,
      deleted_at: null,
    };
    const soul = rowToSoul(row);
    deepStrictEqual(Object.keys(soul).sort(), [
      "createdAt",
      "deletedAt",
      "description",
      "essence",
      "id",
      "level",
      "name",
      "slug",
      "updatedAt",
    ]);
  });
});
