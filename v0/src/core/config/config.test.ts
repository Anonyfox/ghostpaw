import assert from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Config, InterceptorConfig } from "./config.ts";
import {
  applyApiKeys,
  applyModels,
  ensureApiKey,
  readConfig,
  resolveModel,
  writeConfig,
} from "./config.ts";

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
    assert.strictEqual(typeof config.system_prompt, "string");
    assert.ok(config.system_prompt.length > 0);
    assert.deepStrictEqual(config.api_keys, {});
  });

  it("reads back written config", () => {
    const config: Config = {
      model: "custom-model",
      models: { anthropic: "claude-test" },
      system_prompt: "Custom prompt",
      api_keys: { anthropic: "sk-test" },
      interceptor: STUB_INTERCEPTOR,
    };
    writeConfig(tmpDir, config);
    const loaded = readConfig(tmpDir);
    assert.strictEqual(loaded.model, "custom-model");
    assert.strictEqual(loaded.models.anthropic, "claude-test");
    assert.strictEqual(loaded.system_prompt, "Custom prompt");
    assert.strictEqual(loaded.api_keys.anthropic, "sk-test");
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
    for (const key of ["API_KEY_ANTHROPIC", "API_KEY_OPENAI"]) {
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
      models: {},
      system_prompt: "p",
      api_keys: { anthropic: "sk-test-123" },
      interceptor: STUB_INTERCEPTOR,
    };
    applyApiKeys(config);
    assert.strictEqual(process.env.API_KEY_ANTHROPIC, "sk-test-123");
  });

  it("does not overwrite existing env vars", () => {
    process.env.API_KEY_ANTHROPIC = "existing";
    const config: Config = {
      model: "m",
      models: {},
      system_prompt: "p",
      api_keys: { anthropic: "sk-new" },
      interceptor: STUB_INTERCEPTOR,
    };
    applyApiKeys(config);
    assert.strictEqual(process.env.API_KEY_ANTHROPIC, "existing");
  });
});

describe("ensureApiKey", () => {
  const originalEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "API_KEY_ANTHROPIC",
    "API_KEY_OPENAI",
    "API_KEY_XAI",
    "API_KEY_GOOGLE",
    "API_KEY_GROQ",
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

  it("returns true when env var is set", () => {
    process.env.API_KEY_ANTHROPIC = "sk-test";
    const config: Config = {
      model: "m",
      models: {},
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), true);
  });

  it("returns true when config has a key", () => {
    const config: Config = {
      model: "m",
      models: {},
      system_prompt: "p",
      api_keys: { anthropic: "sk-test" },
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), true);
  });

  it("returns false when no keys at all", () => {
    const config: Config = {
      model: "m",
      models: {},
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(ensureApiKey(config, tmpDir), false);
  });
});

describe("applyModels", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    originalEnv.MODEL_ANTHROPIC = process.env.MODEL_ANTHROPIC;
    delete process.env.MODEL_ANTHROPIC;
  });

  afterEach(() => {
    if (originalEnv.MODEL_ANTHROPIC !== undefined)
      process.env.MODEL_ANTHROPIC = originalEnv.MODEL_ANTHROPIC;
    else delete process.env.MODEL_ANTHROPIC;
  });

  it("reads model from env into config.models", () => {
    process.env.MODEL_ANTHROPIC = "claude-test";
    const config: Config = {
      model: "m",
      models: {},
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    applyModels(config);
    assert.strictEqual(config.models.anthropic, "claude-test");
  });

  it("env var overrides existing models entry", () => {
    process.env.MODEL_ANTHROPIC = "claude-env";
    const config: Config = {
      model: "m",
      models: { anthropic: "claude-config" },
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    applyModels(config);
    assert.strictEqual(config.models.anthropic, "claude-env");
  });
});

describe("resolveModel", () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["API_KEY_ANTHROPIC", "API_KEY_OPENAI", "API_KEY_XAI"]) {
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

  it("returns per-provider model when API key is present", () => {
    process.env.API_KEY_OPENAI = "sk-test";
    const config: Config = {
      model: "fallback",
      models: { openai: "gpt-test" },
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(resolveModel(config), "gpt-test");
  });

  it("falls back to config.model when no provider match", () => {
    const config: Config = {
      model: "fallback",
      models: { openai: "gpt-test" },
      system_prompt: "p",
      api_keys: {},
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(resolveModel(config), "fallback");
  });

  it("uses api_keys from config for resolution", () => {
    const config: Config = {
      model: "fallback",
      models: { xai: "grok-test" },
      system_prompt: "p",
      api_keys: { xai: "xai-key" },
      interceptor: STUB_INTERCEPTOR,
    };
    assert.strictEqual(resolveModel(config), "grok-test");
  });
});
