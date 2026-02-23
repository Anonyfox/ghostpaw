import { deepStrictEqual, ok, rejects, strictEqual } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ConfigError, ValidationError } from "../lib/errors.js";
import { DEFAULT_CONFIG, loadConfig } from "./config.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "ghostpaw-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("DEFAULT_CONFIG", () => {
  it("has sensible defaults", () => {
    ok(DEFAULT_CONFIG.models.default.length > 0);
    ok(DEFAULT_CONFIG.models.cheap.length > 0);
    ok(DEFAULT_CONFIG.models.powerful.length > 0);
    ok(DEFAULT_CONFIG.costControls.maxTokensPerSession > 0);
    ok(DEFAULT_CONFIG.costControls.maxTokensPerDay > 0);
    strictEqual(DEFAULT_CONFIG.costControls.warnAtPercentage, 80);
  });
});

describe("loadConfig", () => {
  it("returns defaults when no config file exists", async () => {
    const config = await loadConfig(tempDir);
    deepStrictEqual(config.models, DEFAULT_CONFIG.models);
    deepStrictEqual(config.costControls, DEFAULT_CONFIG.costControls);
  });

  it("loads and merges a config.json file", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({
        providers: { anthropic: { apiKey: "sk-ant-test" } },
        models: { default: "anthropic/claude-sonnet-4" },
      }),
    );
    const config = await loadConfig(tempDir);
    strictEqual(config.providers.anthropic?.apiKey, "sk-ant-test");
    strictEqual(config.models.default, "anthropic/claude-sonnet-4");
    strictEqual(config.models.cheap, DEFAULT_CONFIG.models.cheap);
  });

  it("throws ConfigError on invalid JSON", async () => {
    writeFileSync(join(tempDir, "config.json"), "{ not valid json");
    await rejects(
      () => loadConfig(tempDir),
      (err: unknown) => {
        ok(err instanceof ConfigError);
        ok(err.message.includes("parse"));
        return true;
      },
    );
  });

  it("throws ConfigError if config.json is not an object", async () => {
    writeFileSync(join(tempDir, "config.json"), '"just a string"');
    await rejects(
      () => loadConfig(tempDir),
      (err: unknown) => {
        ok(err instanceof ConfigError);
        return true;
      },
    );
  });

  it("resolves API keys from environment variables", async () => {
    const prevAnthropic = process.env.ANTHROPIC_API_KEY;
    const prevOpenai = process.env.OPENAI_API_KEY;
    const prevXai = process.env.XAI_API_KEY;

    try {
      process.env.ANTHROPIC_API_KEY = "env-ant-key";
      process.env.OPENAI_API_KEY = "env-oai-key";
      process.env.XAI_API_KEY = "env-xai-key";

      const config = await loadConfig(tempDir);
      strictEqual(config.providers.anthropic?.apiKey, "env-ant-key");
      strictEqual(config.providers.openai?.apiKey, "env-oai-key");
      strictEqual(config.providers.xai?.apiKey, "env-xai-key");
    } finally {
      if (prevAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prevAnthropic;
      if (prevOpenai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevOpenai;
      if (prevXai === undefined) delete process.env.XAI_API_KEY;
      else process.env.XAI_API_KEY = prevXai;
    }
  });

  it("config file keys take precedence over env vars", async () => {
    const prevAnthropic = process.env.ANTHROPIC_API_KEY;
    try {
      process.env.ANTHROPIC_API_KEY = "from-env";
      writeFileSync(
        join(tempDir, "config.json"),
        JSON.stringify({ providers: { anthropic: { apiKey: "from-file" } } }),
      );
      const config = await loadConfig(tempDir);
      strictEqual(config.providers.anthropic?.apiKey, "from-file");
    } finally {
      if (prevAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prevAnthropic;
    }
  });

  it("throws ValidationError if maxTokensPerSession is not positive", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({
        providers: { anthropic: { apiKey: "sk-test" } },
        costControls: { maxTokensPerSession: -1 },
      }),
    );
    await rejects(
      () => loadConfig(tempDir),
      (err: unknown) => {
        ok(err instanceof ValidationError);
        ok(err.field === "maxTokensPerSession");
        return true;
      },
    );
  });

  it("throws ValidationError if warnAtPercentage is out of range", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({
        providers: { anthropic: { apiKey: "sk-test" } },
        costControls: { warnAtPercentage: 150 },
      }),
    );
    await rejects(
      () => loadConfig(tempDir),
      (err: unknown) => {
        ok(err instanceof ValidationError);
        return true;
      },
    );
  });

  it("accepts model without provider prefix", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({
        providers: { anthropic: { apiKey: "sk-test" } },
        models: { default: "claude-sonnet-4" },
      }),
    );
    const config = await loadConfig(tempDir);
    strictEqual(config.models.default, "claude-sonnet-4");
  });
});
