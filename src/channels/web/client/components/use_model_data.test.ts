import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { useModelData } from "./use_model_data.ts";

describe("useModelData", () => {
  it("is a function", () => {
    ok(typeof useModelData === "function");
  });

  it("accepts no arguments", () => {
    strictEqual(useModelData.length, 0);
  });
});
