import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig } from "../../core/config/api/read/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { ProviderInfo } from "../../lib/models/index.ts";
import type { ProviderFetcher } from "./cmd_model.ts";
import { executeModel } from "./cmd_model.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;

const MOCK_PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    hasKey: true,
    isCurrent: true,
    models: ["claude-sonnet-4-6", "claude-haiku-4-20250514"],
    modelsSource: "static",
  },
  {
    id: "xai",
    name: "xAI",
    hasKey: true,
    isCurrent: false,
    models: ["grok-3", "grok-4-0806"],
    modelsSource: "static",
  },
  {
    id: "openai",
    name: "OpenAI",
    hasKey: false,
    isCurrent: false,
    models: ["gpt-4.1", "o3"],
    modelsSource: "static",
  },
];

const mockFetch: ProviderFetcher = async () => MOCK_PROVIDERS;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function makeCtx(): CommandContext {
  return {
    db,
    sessionId: 1,
    sessionKey: "test",
    configuredKeys: new Set(["API_KEY_ANTHROPIC"]),
    workspace: ".",
    version: "0.0.0-dev",
  };
}

describe("executeModel", () => {
  it("lists all models grouped by provider when no arg given", async () => {
    const result = await executeModel(makeCtx(), "", mockFetch);
    ok(result.text.includes("Current:"));
    ok(result.text.includes("Anthropic"));
    ok(result.text.includes("xAI"));
    ok(result.text.includes("OpenAI"));
    ok(result.text.includes("claude-sonnet-4-6"));
    ok(result.text.includes("grok-3"));
    strictEqual(result.action, undefined);
  });

  it("switches model when valid name given", async () => {
    const result = await executeModel(makeCtx(), "grok-3", mockFetch);
    ok(result.text.includes("Model set to grok-3"));
    ok(result.action);
    strictEqual(result.action!.type, "model_changed");
    if (result.action!.type === "model_changed") {
      strictEqual(result.action.model, "grok-3");
    }
    strictEqual(getConfig(db, "default_model"), "grok-3");
  });

  it("suggests closest matches for invalid model name", async () => {
    const result = await executeModel(makeCtx(), "grk-3", mockFetch);
    ok(result.text.includes('Unknown model "grk-3"'));
    ok(result.text.includes("Did you mean"));
    ok(result.text.includes("grok-3"));
    strictEqual(result.action, undefined);
  });

  it("marks active model in listing", async () => {
    const result = await executeModel(makeCtx(), "", mockFetch);
    ok(result.text.includes("[active]"));
  });

  it("shows configured status per provider", async () => {
    const result = await executeModel(makeCtx(), "", mockFetch);
    ok(result.text.includes("configured"));
    ok(result.text.includes("no key"));
  });

  it("returns no models message when providers have no models", async () => {
    const emptyFetch: ProviderFetcher = async () => [];
    const result = await executeModel(makeCtx(), "anything", emptyFetch);
    ok(result.text.includes("No models available"));
  });
});
