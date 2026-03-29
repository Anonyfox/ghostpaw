import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry } from "./scrub.ts";
import { setSetting } from "./set.ts";
import { syncEnvToSettings } from "./sync_env_to_settings.ts";

describe("settings/sync_env_to_settings", () => {
  let db: DatabaseHandle;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    db = openMemoryDatabase();
    initSettingsTable(db);
    clearSecretRegistry();
    for (const key of Object.keys(KNOWN_SETTINGS)) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    db.close();
    clearSecretRegistry();
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it("imports env vars into empty database", () => {
    process.env.GHOSTPAW_MODEL = "gpt-5.4";
    syncEnvToSettings(db);
    const row = db
      .prepare(
        "SELECT value, source FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL",
      )
      .get() as { value: string; source: string };
    assert.strictEqual(row.value, "gpt-5.4");
    assert.strictEqual(row.source, "env");
  });

  it("overwrites stale DB value with env value", () => {
    setSetting(db, "GHOSTPAW_MODEL", "old-value");
    process.env.GHOSTPAW_MODEL = "new-from-env";
    syncEnvToSettings(db);
    const row = db
      .prepare("SELECT value FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
      .get() as { value: string };
    assert.strictEqual(row.value, "new-from-env");
  });

  it("skips when env value matches DB value", () => {
    setSetting(db, "GHOSTPAW_MODEL", "same-value");
    process.env.GHOSTPAW_MODEL = "same-value";
    const countBefore = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'GHOSTPAW_MODEL'")
      .get() as { c: number };
    syncEnvToSettings(db);
    const countAfter = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'GHOSTPAW_MODEL'")
      .get() as { c: number };
    assert.strictEqual(countBefore.c, countAfter.c);
  });

  it("imports secret env vars", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-testkey1234";
    syncEnvToSettings(db);
    const row = db
      .prepare(
        "SELECT secret, source FROM settings WHERE key = 'ANTHROPIC_API_KEY' AND next_id IS NULL",
      )
      .get() as { secret: number; source: string };
    assert.strictEqual(row.secret, 1);
    assert.strictEqual(row.source, "env");
  });

  it("does nothing for unset env vars", () => {
    syncEnvToSettings(db);
    const count = db.prepare("SELECT COUNT(*) as c FROM settings").get() as { c: number };
    assert.strictEqual(count.c, 0);
  });
});
