import assert from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Config, InterceptorConfig } from "./config.ts";
import { applyApiKeys, ensureApiKey, readConfig, resolveModels, writeConfig } from "./config.ts";

const STUB_INTERCEPTOR: InterceptorConfig = {
  enabled: false,
  subsystems: {},
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ghostpaw-config-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("readConfig", () => {
  it("creates default config.json on first read", () => {
    const config = readConfig(tmpDir);
    assert.strictEqual(typeof config.model, "string");
    assert.ok(config.model.length > 0);
    assert.strictEqual(typeof config.model_small, "string");
    assert.ok(config.model_small.length > 0);
    assert.strictEqual(typeof config.system_prompt, "string");
    assert.ok(config.system_prompt.length > 0);
    assert.deepStrictEqual(config.api_keys, {});
  });

  it("reads back written config", () => {
    const config: Config = {
      model: "custom-model",
      model_small: "custom-small",
      system_prompt: "Custom prompt",
      api_keys: { anthropic: "sk-test" },
      interceptor: STUB_INTERCEPTOR,
    };
    writeConfig(tmpDir, config);
    const loaded = readConfig(tmpDir);
    assert.strictEqual(loaded.model, "custom-model");
    assert.strictEqual(loaded.model_small, "custom-small");
    assert.strictEqual(loaded.system_prompt, "Custom prompt");
    assert.strictEqual(loaded.api_keys.anthropic, "sk-test");
  });

  it("default config includes subsystem knobs", () => {
    const config = readConfig(tmpDir);
    const scribe = config.interceptor.subsystems.scribe;
    assert.strictEqual(scribe.enabled, true);
    assert.strictEqual(scribe.lookback, 3);
    assert.strictEqual(scribe.max_iterations, 15);
    assert.strictEqual(scribe.timeout_ms, 60000);

    const innkeeper = config.interceptor.subsystems.innkeeper;
    assert.strictEqual(innkeeper.enabled, true);
    assert.strictEqual(innkeeper.max_iterations, 15);
  });

  it("partial subsystem override merges with defaults", () => {
    const path = join(tmpDir, "config.json");
    writeFileSync(
      path,
      JSON.stringify({
        interceptor: { subsystems: { scribe: { max_iterations: 5 } } },
      }),
      "utf-8",
    );
    const config = readConfig(tmpDir);
    const scribe = config.interceptor.subsystems.scribe;
    assert.strictEqual(scribe.max_iterations, 5);
    assert.strictEqual(scribe.enabled, true);
    assert.strictEqual(scribe.lookback, 3);
    assert.strictEqual(scribe.timeout_ms, 60000);
  });

  it("handles malformed JSON gracefully", () => {
    const path = join(tmpDir, "config.json");
    writeFileSync(path, "not json", "utf-8");
    const config = readConfig(tmpDir);
    assert.strictEqual(typeof config.model, "string");
  });
});

describe("applyApiKeys", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it("sets environment variables from config", () => {
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: { anthropic: "sk-test-123" },
      interceptor: STUB_INTERCEPTOR,
    };
    applyApiKeys(config);
    assert.strictEqual(process.env.ANTHROPIC_API_KEY, "sk-test-123");
  });

  it("does not overwrite existing env vars", () => {
    process.env.ANTHROPIC_API_KEY = "existing";
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: { anthropic: "sk-new" },
      interceptor: STUB_INTERCEPTOR,
    };
    applyApiKeys(config);
    assert.strictEqual(process.env.ANTHROPIC_API_KEY, "existing");
  });
});

describe("ensureApiKey", () => {
  const originalEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "XAI_API_KEY",
    "API_KEY_ANTHROPIC",
    "API_KEY_OPENAI",
    "API_KEY_XAI",
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it("returns true when official env var is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), true);
  });

  it("returns true when legacy env var is set", () => {
    process.env.API_KEY_OPENAI = "sk-test";
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), true);
  });

  it("returns true when config has a key", () => {
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: { anthropic: "sk-test" },
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), true);
  });

  it("returns false when no keys at all", () => {
    const config: Config = {
      model: "m",
      model_small: "ms",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), false);
  });
});

describe("resolveModels", () => {
  const originalEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "XAI_API_KEY",
    "API_KEY_ANTHROPIC",
    "API_KEY_OPENAI",
    "API_KEY_XAI",
  ];

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val !== undefined) process.env[key] = val;
      else delete process.env[key];
    }
  });

  it("returns provider defaults when official env key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const config: Config = {
      model: "fallback",
      model_small: "fallback-small",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    const result = resolveModels(config);
    assert.strictEqual(result.model, "gpt-5.4");
    assert.strictEqual(result.model_small, "gpt-5.4-mini");
  });

  it("returns provider defaults when legacy env key is present", () => {
    process.env.API_KEY_XAI = "xai-test";
    const config: Config = {
      model: "fallback",
      model_small: "fallback-small",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    const result = resolveModels(config);
    assert.strictEqual(result.model, "grok-4-1");
    assert.strictEqual(result.model_small, "grok-4-1-fast-non-reasoning");
  });

  it("falls back to config values when no provider match", () => {
    const config: Config = {
      model: "fallback",
      model_small: "fallback-small",
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    const result = resolveModels(config);
    assert.strictEqual(result.model, "fallback");
    assert.strictEqual(result.model_small, "fallback-small");
  });

  it("uses api_keys from config for resolution", () => {
    const config: Config = {
      model: "fallback",
      model_small: "fallback-small",
      system_prompt: "p",
      api_keys: { xai: "xai-key" },
      interceptor: STUB_INTERCEPTOR,
    };
    const result = resolveModels(config);
    assert.strictEqual(result.model, "grok-4-1");
    assert.strictEqual(result.model_small, "grok-4-1-fast-non-reasoning");
  });
});
