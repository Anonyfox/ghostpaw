import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelsResponse, ProviderInfo } from "./models_types.ts";

describe("ProviderInfo", () => {
  it("accepts a complete provider entry", () => {
    const provider: ProviderInfo = {
      id: "anthropic",
      name: "Anthropic",
      hasKey: true,
      isCurrent: true,
      models: ["claude-sonnet-4-6", "claude-opus-4"],
      modelsSource: "live",
    };
    strictEqual(provider.id, "anthropic");
    deepStrictEqual(provider.models, ["claude-sonnet-4-6", "claude-opus-4"]);
  });

  it("accepts an entry with error and no models", () => {
    const provider: ProviderInfo = {
      id: "openai",
      name: "OpenAI",
      hasKey: true,
      isCurrent: false,
      models: [],
      modelsSource: "static",
      error: "API request failed",
    };
    strictEqual(provider.models.length, 0);
    ok(provider.error);
  });
});

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
