import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import { buildConfig, DEFAULT_SYSTEM_PROMPT } from "./build_config.ts";

describe("settings/build_config", () => {
  afterEach(() => {
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.GHOSTPAW_MODEL_SMALL;
    delete process.env.GHOSTPAW_MODEL_LARGE;
    delete process.env.GHOSTPAW_INTERCEPTOR_ENABLED;
    delete process.env.GHOSTPAW_SCRIBE_ENABLED;
    delete process.env.GHOSTPAW_SCRIBE_LOOKBACK;
    delete process.env.GHOSTPAW_SCRIBE_MAX_ITERATIONS;
    delete process.env.GHOSTPAW_SCRIBE_TIMEOUT_MS;
    delete process.env.GHOSTPAW_INNKEEPER_ENABLED;
    delete process.env.GHOSTPAW_INNKEEPER_LOOKBACK;
    delete process.env.GHOSTPAW_INNKEEPER_MAX_ITERATIONS;
    delete process.env.GHOSTPAW_INNKEEPER_TIMEOUT_MS;
  });

  it("returns defaults when no env vars are set", () => {
    const config = buildConfig();
    assert.strictEqual(config.model, "claude-sonnet-4-5");
    assert.strictEqual(config.model_small, "claude-haiku-4-5");
    assert.strictEqual(config.model_large, "claude-opus-4-5");
    assert.strictEqual(config.system_prompt, DEFAULT_SYSTEM_PROMPT);
    assert.strictEqual(config.interceptor.enabled, true);
    assert.strictEqual(config.interceptor.subsystems.scribe.lookback, 3);
  });

  it("reads model from env", () => {
    process.env.GHOSTPAW_MODEL = "gpt-5.4";
    const config = buildConfig();
    assert.strictEqual(config.model, "gpt-5.4");
  });

  it("reads interceptor settings from env", () => {
    process.env.GHOSTPAW_INTERCEPTOR_ENABLED = "false";
    process.env.GHOSTPAW_SCRIBE_LOOKBACK = "10";
    const config = buildConfig();
    assert.strictEqual(config.interceptor.enabled, false);
    assert.strictEqual(config.interceptor.subsystems.scribe.lookback, 10);
  });

  it("system_prompt is always the default constant", () => {
    const config = buildConfig();
    assert.ok(config.system_prompt.includes("Ghostpaw"));
  });
});
