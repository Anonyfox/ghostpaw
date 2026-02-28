import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProviderInfo } from "./provider_info.ts";

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
