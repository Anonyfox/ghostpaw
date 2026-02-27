import { strictEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { clearModelsCache } from "./clear_models_cache.ts";
import { modelsCache } from "./models_cache.ts";

describe("clearModelsCache", () => {
  afterEach(() => {
    modelsCache.current = null;
  });

  it("resets cache to null", () => {
    modelsCache.current = {
      data: { currentModel: "gpt-4", currentProvider: "openai", providers: [] },
      fetchedAt: Date.now(),
    };
    clearModelsCache();
    strictEqual(modelsCache.current, null);
  });

  it("is a no-op when cache is already null", () => {
    clearModelsCache();
    strictEqual(modelsCache.current, null);
  });
});
