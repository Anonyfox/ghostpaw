import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { resolveModels } from "./resolve_models.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry } from "./scrub.ts";
import { setSetting } from "./set.ts";

describe("settings/resolve_models", () => {
  let db: DatabaseHandle;
  const savedKeys: Record<string, string | undefined> = {};
  const providerEnvs = [
    "ANTHROPIC_API_KEY",
    "API_KEY_ANTHROPIC",
    "OPENAI_API_KEY",
    "API_KEY_OPENAI",
    "XAI_API_KEY",
    "API_KEY_XAI",
  ];

  beforeEach(() => {
    db = openMemoryDatabase();
    initSettingsTable(db);
    clearSecretRegistry();
    for (const key of providerEnvs) {
      savedKeys[key] = process.env[key];
      delete process.env[key];
    }
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.GHOSTPAW_MODEL_SMALL;
    delete process.env.GHOSTPAW_MODEL_LARGE;
  });

  afterEach(() => {
    db.close();
    clearSecretRegistry();
    for (const [key, val] of Object.entries(savedKeys)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.GHOSTPAW_MODEL_SMALL;
    delete process.env.GHOSTPAW_MODEL_LARGE;
  });

  it("does not override explicit model choice", () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    setSetting(db, "GHOSTPAW_MODEL", "my-custom-model");
    resolveModels(db);
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get() as { value: string };
    assert.strictEqual(row.value, "my-custom-model");
  });

  it("auto-detects anthropic when key is active", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    resolveModels(db);
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get() as { value: string } | undefined;
    assert.ok(row, "resolveModels should have written a model row");
    assert.strictEqual(row.value, "claude-sonnet-4-5");

    const smallRow = db
      .prepare(
        "SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL_SMALL' AND next_id IS NULL",
      )
      .get() as { value: string } | undefined;
    assert.ok(smallRow, "resolveModels should have written model_small too");
    assert.strictEqual(smallRow.value, "claude-haiku-4-5");

    const largeRow = db
      .prepare(
        "SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL_LARGE' AND next_id IS NULL",
      )
      .get() as { value: string } | undefined;
    assert.ok(largeRow, "resolveModels should have written model_large too");
    assert.strictEqual(largeRow.value, "claude-opus-4-5");
  });

  it("does nothing when no provider is active", () => {
    resolveModels(db);
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get();
    assert.strictEqual(row, undefined);
  });
});
