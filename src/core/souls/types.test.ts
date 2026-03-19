import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { TraitStatus } from "./types.ts";
import { TRAIT_STATUSES } from "./types.ts";

describe("TRAIT_STATUSES", () => {
  it("contains exactly the four valid statuses", () => {
    deepStrictEqual([...TRAIT_STATUSES], ["active", "consolidated", "promoted", "reverted"]);
  });

  it("has exactly four entries", () => {
    strictEqual(TRAIT_STATUSES.length, 4);
  });

  it("produces a union type that accepts valid statuses", () => {
    const valid: TraitStatus[] = ["active", "consolidated", "promoted", "reverted"];
    strictEqual(valid.length, 4);
  });
});
