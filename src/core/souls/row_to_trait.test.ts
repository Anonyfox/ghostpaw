import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToTrait } from "./row_to_trait.ts";

describe("rowToTrait", () => {
  it("converts a database row to a SoulTrait", () => {
    const row = {
      id: 7,
      soul_id: 2,
      principle: "Verify API shapes",
      provenance: "Three runs failed",
      generation: 1,
      status: "active",
      merged_into: null,
      created_at: 1000,
      updated_at: 2000,
    };
    const trait = rowToTrait(row);
    strictEqual(trait.id, 7);
    strictEqual(trait.soulId, 2);
    strictEqual(trait.principle, "Verify API shapes");
    strictEqual(trait.provenance, "Three runs failed");
    strictEqual(trait.generation, 1);
    strictEqual(trait.status, "active");
    strictEqual(trait.mergedInto, null);
    strictEqual(trait.createdAt, 1000);
    strictEqual(trait.updatedAt, 2000);
  });

  it("handles non-null merged_into", () => {
    const row = {
      id: 3,
      soul_id: 4,
      principle: "old",
      provenance: "old evidence",
      generation: 0,
      status: "consolidated",
      merged_into: 10,
      created_at: 500,
      updated_at: 600,
    };
    strictEqual(rowToTrait(row).mergedInto, 10);
  });

  it("treats undefined merged_into as null", () => {
    const row = {
      id: 1,
      soul_id: 1,
      principle: "p",
      provenance: "e",
      generation: 0,
      status: "active",
      merged_into: undefined,
      created_at: 1,
      updated_at: 1,
    };
    strictEqual(rowToTrait(row).mergedInto, null);
  });
});
