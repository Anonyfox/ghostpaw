import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { applySettingsToEnv } from "./apply_settings_to_env.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry, getSecretValues } from "./scrub.ts";
import { setSetting } from "./set.ts";

describe("settings/apply_settings_to_env", () => {
  let db: DatabaseHandle;

  beforeEach(() => {
    db = openMemoryDatabase();
    initSettingsTable(db);
    clearSecretRegistry();
  });

  afterEach(() => {
    db.close();
    clearSecretRegistry();
    delete process.env.GHOSTPAW_MODEL;
    delete process.env.GHOSTPAW_MODEL_SMALL;
    delete process.env.GHOSTPAW_SCRIBE_LOOKBACK;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GHOSTPAW_MAX_TURN_ITERATIONS;
  });

  it("applies DB values to process.env", () => {
    setSetting(db, "GHOSTPAW_MODEL", "gpt-5.4");
    delete process.env.GHOSTPAW_MODEL;
    clearSecretRegistry();
    applySettingsToEnv(db);
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "gpt-5.4");
  });

  it("applies known defaults for missing DB rows", () => {
    applySettingsToEnv(db);
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "claude-sonnet-4-5");
    assert.strictEqual(process.env.GHOSTPAW_MODEL_SMALL, "claude-haiku-4-5");
    assert.strictEqual(process.env.GHOSTPAW_MAX_TURN_ITERATIONS, "25");
  });

  it("registers secrets in scrub registry", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-testkey12345678";
    setSetting(db, "ANTHROPIC_API_KEY", "sk-ant-testkey12345678");
    clearSecretRegistry();
    applySettingsToEnv(db);
    const values = getSecretValues();
    assert.ok(values.includes("sk-ant-testkey12345678"));
  });

  it("DB values override known defaults", () => {
    setSetting(db, "GHOSTPAW_MODEL", "custom-model");
    clearSecretRegistry();
    delete process.env.GHOSTPAW_MODEL;
    applySettingsToEnv(db);
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "custom-model");
  });
});
