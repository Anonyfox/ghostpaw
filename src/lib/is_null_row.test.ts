import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { isNullRow } from "./is_null_row.ts";

describe("isNullRow", () => {
  it("returns true for undefined", () => {
    strictEqual(isNullRow(undefined), true);
  });

  it("returns true for an object where all values are null", () => {
    strictEqual(isNullRow({ id: null, name: null }), true);
  });

  it("returns false for an object with at least one real value", () => {
    strictEqual(isNullRow({ id: 1, name: null }), false);
  });

  it("returns false for an object with all real values", () => {
    strictEqual(isNullRow({ id: 1, name: "alice" }), false);
  });

  it("returns true for an empty object", () => {
    strictEqual(isNullRow({}), true);
  });
});
