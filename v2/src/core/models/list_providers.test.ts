import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { initConfigTable, setConfig } from "../config/index.ts";
import { initSecretsTable, setSecret } from "../secrets/index.ts";
import { listProviders } from "./list_providers.ts";

function mockFetcher(models: string[] = ["mock-model-a", "mock-model-b"]) {
  return async () => models;
}

function failFetcher(msg = "network error") {
  return async () => {
    throw new Error(msg);
  };
}

describe("listProviders", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initSecretsTable(db);
    initConfigTable(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns all three providers", async () => {
    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(), openai: mockFetcher(), xai: mockFetcher() },
    });
    strictEqual(providers.length, 3);
    deepStrictEqual(
      providers.map((p) => p.id),
      ["anthropic", "openai", "xai"],
    );
  });

  it("marks providers without keys as hasKey=false", async () => {
    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(), openai: mockFetcher(), xai: mockFetcher() },
    });
    for (const p of providers) {
      strictEqual(p.hasKey, false);
      strictEqual(p.modelsSource, "static");
    }
  });

  it("marks provider with key as hasKey=true and uses fetcher", async () => {
    setSecret(db, "API_KEY_ANTHROPIC", "sk-test");
    process.env.API_KEY_ANTHROPIC = "sk-test";

    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(["claude-sonnet-4-6", "claude-opus-4"]) },
    });

    const anthropic = providers.find((p) => p.id === "anthropic")!;
    strictEqual(anthropic.hasKey, true);
    strictEqual(anthropic.modelsSource, "live");
    deepStrictEqual(anthropic.models, ["claude-sonnet-4-6", "claude-opus-4"]);

    delete process.env.API_KEY_ANTHROPIC;
  });

  it("marks the current provider as isCurrent=true", async () => {
    setSecret(db, "API_KEY_ANTHROPIC", "sk-test");
    process.env.API_KEY_ANTHROPIC = "sk-test";

    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher() },
    });

    const anthropic = providers.find((p) => p.id === "anthropic")!;
    strictEqual(anthropic.isCurrent, true);

    const openai = providers.find((p) => p.id === "openai")!;
    strictEqual(openai.isCurrent, false);

    delete process.env.API_KEY_ANTHROPIC;
  });

  it("detects current provider from overridden model", async () => {
    setConfig(db, "default_model", "gpt-4o", "web");
    setSecret(db, "API_KEY_OPENAI", "sk-test");
    process.env.API_KEY_OPENAI = "sk-test";

    const providers = await listProviders(db, {
      fetchers: { openai: mockFetcher(["gpt-4o"]) },
    });

    const openai = providers.find((p) => p.id === "openai")!;
    strictEqual(openai.isCurrent, true);

    const anthropic = providers.find((p) => p.id === "anthropic")!;
    strictEqual(anthropic.isCurrent, false);

    delete process.env.API_KEY_OPENAI;
  });

  it("falls back to static models when fetch fails for keyed provider", async () => {
    setSecret(db, "API_KEY_OPENAI", "sk-bad");
    process.env.API_KEY_OPENAI = "sk-bad";

    const providers = await listProviders(db, {
      fetchers: { openai: failFetcher("401 Unauthorized") },
    });

    const openai = providers.find((p) => p.id === "openai")!;
    strictEqual(openai.hasKey, true);
    strictEqual(openai.modelsSource, "static");
    ok(openai.models.length > 0, "has static fallback models");
    strictEqual(openai.error, "401 Unauthorized");

    delete process.env.API_KEY_OPENAI;
  });

  it("returns display names for all providers", async () => {
    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(), openai: mockFetcher(), xai: mockFetcher() },
    });
    strictEqual(providers.find((p) => p.id === "anthropic")!.name, "Anthropic");
    strictEqual(providers.find((p) => p.id === "openai")!.name, "OpenAI");
    strictEqual(providers.find((p) => p.id === "xai")!.name, "xAI");
  });

  it("handles no keys and default model gracefully", async () => {
    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(), openai: mockFetcher(), xai: mockFetcher() },
    });
    const current = providers.filter((p) => p.isCurrent);
    strictEqual(current.length, 1, "default model maps to one provider");
    strictEqual(current[0].id, "anthropic", "default claude model is anthropic");
  });

  it("sets isCurrent=false for all when model is unrecognized", async () => {
    setConfig(db, "default_model", "unknown-model-xyz", "web");
    const providers = await listProviders(db, {
      fetchers: { anthropic: mockFetcher(), openai: mockFetcher(), xai: mockFetcher() },
    });
    const current = providers.filter((p) => p.isCurrent);
    strictEqual(current.length, 0);
  });
});
