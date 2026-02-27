import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchProviderModels } from "./fetch_provider_models.ts";
import type { ModelFetcher } from "./types.ts";

const MOCK_MODELS = ["model-a", "model-b", "model-c"];

function successFetcher(models: string[] = MOCK_MODELS): ModelFetcher {
  return async () => models;
}

function failFetcher(message = "API error"): ModelFetcher {
  return async () => {
    throw new Error(message);
  };
}

function slowFetcher(delayMs: number, models: string[] = MOCK_MODELS): ModelFetcher {
  return () => new Promise((resolve) => setTimeout(() => resolve(models), delayMs));
}

describe("fetchProviderModels", () => {
  it("returns live models on successful fetch", async () => {
    const result = await fetchProviderModels("anthropic", "sk-test", {
      fetcher: successFetcher(),
    });
    strictEqual(result.source, "live");
    deepStrictEqual(result.models, MOCK_MODELS);
    strictEqual(result.error, undefined);
  });

  it("falls back to static models on fetch failure", async () => {
    const result = await fetchProviderModels("anthropic", "sk-test", {
      fetcher: failFetcher("401 Unauthorized"),
    });
    strictEqual(result.source, "static");
    ok(result.models.length > 0, "static fallback has models");
    strictEqual(result.error, "401 Unauthorized");
  });

  it("falls back to static models on timeout", async () => {
    const result = await fetchProviderModels("openai", "sk-test", {
      fetcher: slowFetcher(500),
      timeoutMs: 50,
    });
    strictEqual(result.source, "static");
    ok(result.models.length > 0, "static fallback has models");
    ok(result.error?.includes("Timed out"), "error mentions timeout");
  });

  it("returns live models when fetch completes within timeout", async () => {
    const result = await fetchProviderModels("openai", "sk-test", {
      fetcher: slowFetcher(10, ["fast-model"]),
      timeoutMs: 500,
    });
    strictEqual(result.source, "live");
    deepStrictEqual(result.models, ["fast-model"]);
  });

  it("returns static fallback for each provider on error", async () => {
    for (const pid of ["anthropic", "openai", "xai"] as const) {
      const result = await fetchProviderModels(pid, "sk-test", {
        fetcher: failFetcher(),
      });
      strictEqual(result.source, "static");
      ok(result.models.length > 0, `${pid} has static fallback models`);
    }
  });

  it("returns empty live list if fetcher returns empty array", async () => {
    const result = await fetchProviderModels("anthropic", "sk-test", {
      fetcher: successFetcher([]),
    });
    strictEqual(result.source, "live");
    deepStrictEqual(result.models, []);
  });

  it("captures non-Error throw as string in error field", async () => {
    const result = await fetchProviderModels("anthropic", "sk-test", {
      fetcher: async () => {
        throw "raw string error";
      },
    });
    strictEqual(result.source, "static");
    strictEqual(result.error, "raw string error");
  });
});
