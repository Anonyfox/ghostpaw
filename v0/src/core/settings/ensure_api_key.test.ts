import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ensureApiKey } from "./ensure_api_key.ts";

describe("settings/ensure_api_key", () => {
  const providerEnvs = [
    "ANTHROPIC_API_KEY",
    "API_KEY_ANTHROPIC",
    "OPENAI_API_KEY",
    "API_KEY_OPENAI",
    "XAI_API_KEY",
    "API_KEY_XAI",
  ];
  const savedKeys: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of providerEnvs) {
      savedKeys[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedKeys)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it("returns true when a provider key is active", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    assert.strictEqual(ensureApiKey("/tmp"), true);
  });

  it("returns false when no provider key is set", () => {
    assert.strictEqual(ensureApiKey("/tmp"), false);
  });
});
