import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToLevel } from "./row_to_level.ts";

describe("rowToLevel", () => {
  it("converts a database row to a SoulLevel", () => {
    const row = {
      id: 1,
      soul_id: 2,
      level: 2,
      essence_before: "old essence",
      essence_after: "new essence",
      traits_consolidated: "[1,2,3]",
      traits_promoted: "[4]",
      traits_carried: "[5,6]",
      traits_merged: "[7,8]",
      created_at: 9000,
    };
    const lvl = rowToLevel(row);
    strictEqual(lvl.id, 1);
    strictEqual(lvl.soulId, 2);
    strictEqual(lvl.level, 2);
    strictEqual(lvl.essenceBefore, "old essence");
    strictEqual(lvl.essenceAfter, "new essence");
    deepStrictEqual(lvl.traitsConsolidated, [1, 2, 3]);
    deepStrictEqual(lvl.traitsPromoted, [4]);
    deepStrictEqual(lvl.traitsCarried, [5, 6]);
    deepStrictEqual(lvl.traitsMerged, [7, 8]);
    strictEqual(lvl.createdAt, 9000);
  });

  it("handles empty JSON arrays", () => {
    const row = {
      id: 2,
      soul_id: 4,
      level: 1,
      essence_before: "a",
      essence_after: "b",
      traits_consolidated: "[]",
      traits_promoted: "[]",
      traits_carried: "[]",
      traits_merged: "[]",
      created_at: 1000,
    };
    const lvl = rowToLevel(row);
    deepStrictEqual(lvl.traitsConsolidated, []);
    deepStrictEqual(lvl.traitsPromoted, []);
    deepStrictEqual(lvl.traitsCarried, []);
    deepStrictEqual(lvl.traitsMerged, []);
  });
});
