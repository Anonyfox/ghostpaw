import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { useModelData } from "./use_model_data.ts";

describe("useModelData", () => {
  it("is a function", () => {
    ok(typeof useModelData === "function");
  });
});
