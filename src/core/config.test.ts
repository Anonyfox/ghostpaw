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
        models: { default: "openai/gpt-4o" },
      }),
    );
    const config = await loadConfig(tempDir);
    strictEqual(config.models.default, "openai/gpt-4o");
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

  it("throws ValidationError if maxTokensPerSession is not positive", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({ costControls: { maxTokensPerSession: -1 } }),
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
      JSON.stringify({ costControls: { warnAtPercentage: 150 } }),
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
      JSON.stringify({ models: { default: "claude-sonnet-4" } }),
    );
    const config = await loadConfig(tempDir);
    strictEqual(config.models.default, "claude-sonnet-4");
  });

  it("silently ignores unknown keys like legacy providers", async () => {
    writeFileSync(
      join(tempDir, "config.json"),
      JSON.stringify({
        providers: { anthropic: { apiKey: "sk-old" } },
        models: { default: "claude-sonnet-4" },
      }),
    );
    const config = await loadConfig(tempDir);
    strictEqual(config.models.default, "claude-sonnet-4");
    ok(!("providers" in config));
  });
});
