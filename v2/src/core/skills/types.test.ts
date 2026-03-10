import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { VALIDATION_SEVERITIES } from "./types.ts";

describe("VALIDATION_SEVERITIES", () => {
  it("contains error, warning, info in order", () => {
    deepStrictEqual([...VALIDATION_SEVERITIES], ["error", "warning", "info"]);
    strictEqual(VALIDATION_SEVERITIES.length, 3);
  });
});
