import assert from "node:assert";
import { describe, it } from "node:test";
import { KNOWN_SETTINGS, PROVIDER_KEYS, PROVIDER_MODELS } from "./known.ts";

describe("settings/known", () => {
  it("has 29 known keys", () => {
    assert.strictEqual(Object.keys(KNOWN_SETTINGS).length, 29);
  });

  it("all keys are UPPER_SNAKE_CASE", () => {
    for (const key of Object.keys(KNOWN_SETTINGS)) {
      assert.match(key, /^[A-Z][A-Z0-9_]*$/, `${key} is not UPPER_SNAKE_CASE`);
    }
  });

  it("all keys are unique (key IS the env name)", () => {
    const keys = Object.keys(KNOWN_SETTINGS);
    const unique = new Set(keys);
    assert.strictEqual(keys.length, unique.size, "Duplicate keys detected");
  });

  it("internal settings have GHOSTPAW_ prefix", () => {
    for (const [key, setting] of Object.entries(KNOWN_SETTINGS)) {
      if (!setting.secret) {
        assert.ok(key.startsWith("GHOSTPAW_"), `${key} should have GHOSTPAW_ prefix`);
      }
    }
  });

  it("secrets have no default values", () => {
    for (const [key, setting] of Object.entries(KNOWN_SETTINGS)) {
      if (setting.secret) {
        assert.strictEqual(
          setting.defaultValue,
          undefined,
          `Secret key ${key} should not have a default`,
        );
      }
    }
  });

  it("non-secret settings with defaults have valid types", () => {
    for (const [key, setting] of Object.entries(KNOWN_SETTINGS)) {
      if (!setting.secret && setting.defaultValue !== undefined) {
        if (setting.type === "integer") {
          assert.ok(
            Number.isInteger(Number(setting.defaultValue)),
            `${key} default "${setting.defaultValue}" is not a valid integer`,
          );
        } else if (setting.type === "boolean") {
          assert.ok(
            setting.defaultValue === "true" || setting.defaultValue === "false",
            `${key} default "${setting.defaultValue}" is not a valid boolean`,
          );
        }
      }
    }
  });

  it("has 7 secret keys", () => {
    const secrets = Object.values(KNOWN_SETTINGS).filter((s) => s.secret);
    assert.strictEqual(secrets.length, 7);
  });

  it("provider models cover all provider keys", () => {
    for (const provider of Object.keys(PROVIDER_KEYS)) {
      assert.ok(PROVIDER_MODELS[provider], `Missing model defaults for provider ${provider}`);
    }
  });

  it("cross-slot validation catches wrong-slot keys", () => {
    const anthropic = KNOWN_SETTINGS.ANTHROPIC_API_KEY;
    assert.ok(anthropic.validate);
    assert.strictEqual(anthropic.validate("sk-ant-real-key"), null);
    assert.ok(anthropic.validate("xai-wrong-slot")?.includes("XAI_API_KEY"));
  });
});
