import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { ProviderInfo } from "../../shared/provider_info.ts";
import { modelsCache } from "./models_cache.ts";

const sample: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    hasKey: true,
    isCurrent: true,
    models: ["gpt-4o"],
    modelsSource: "live",
  },
];

afterEach(() => {
  modelsCache.invalidate();
});

describe("modelsCache", () => {
  it("returns null when cache is empty", () => {
    strictEqual(modelsCache.get(), null);
  });

  it("returns cached data after set", () => {
    modelsCache.set(sample);
    const result = modelsCache.get();
    deepStrictEqual(result, sample);
  });

  it("returns null after invalidation", () => {
    modelsCache.set(sample);
    modelsCache.invalidate();
    strictEqual(modelsCache.get(), null);
  });

  it("returns null when TTL expires", () => {
    modelsCache.set(sample);
    const orig = Date.now;
    Date.now = () => orig() + 61 * 60 * 1000;
    try {
      strictEqual(modelsCache.get(), null);
    } finally {
      Date.now = orig;
    }
  });

  it("overwrites previous cache on re-set", () => {
    modelsCache.set(sample);
    const updated: ProviderInfo[] = [
      {
        id: "anthropic",
        name: "Anthropic",
        hasKey: false,
        isCurrent: false,
        models: ["claude-sonnet-4-6"],
        modelsSource: "static",
      },
    ];
    modelsCache.set(updated);
    deepStrictEqual(modelsCache.get(), updated);
  });
});
