import { strictEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CACHE_TTL_MS, modelsCache } from "./models_cache.ts";

describe("modelsCache", () => {
  afterEach(() => {
    modelsCache.current = null;
  });

  it("starts as null", () => {
    strictEqual(modelsCache.current, null);
  });

  it("can store and retrieve a cached response", () => {
    modelsCache.current = {
      data: { currentModel: "gpt-4", currentProvider: "openai", providers: [] },
      fetchedAt: Date.now(),
    };
    strictEqual(modelsCache.current.data.currentModel, "gpt-4");
  });

  it("CACHE_TTL_MS is one hour", () => {
    strictEqual(CACHE_TTL_MS, 60 * 60 * 1000);
  });
});
