import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelsResponse } from "./models_response.ts";

describe("ModelsResponse", () => {
  it("accepts a response with current model and providers", () => {
    const response: ModelsResponse = {
      currentModel: "claude-sonnet-4-6",
      currentProvider: "anthropic",
      providers: [],
    };
    strictEqual(response.currentModel, "claude-sonnet-4-6");
    strictEqual(response.currentProvider, "anthropic");
  });

  it("accepts null currentProvider when model is unknown", () => {
    const response: ModelsResponse = {
      currentModel: "unknown-model",
      currentProvider: null,
      providers: [],
    };
    strictEqual(response.currentProvider, null);
  });
});
