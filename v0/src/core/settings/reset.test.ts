import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { resetSetting } from "./reset.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry, getSecretValues } from "./scrub.ts";
import { setSetting } from "./set.ts";

describe("settings/reset", () => {
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
    delete process.env.MY_CUSTOM_KEY;
    delete process.env.MY_CUSTOM_SECRET;
  });

  it("removes all rows for a key", () => {
    setSetting(db, "GHOSTPAW_MODEL", "first");
    setSetting(db, "GHOSTPAW_MODEL", "second");
    const result = resetSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(result.deleted, 2);
    const count = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'GHOSTPAW_MODEL'")
      .get() as { c: number };
    assert.strictEqual(count.c, 0);
  });

  it("reverts env to known default after reset", () => {
    setSetting(db, "GHOSTPAW_MODEL", "custom");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "custom");
    resetSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "claude-sonnet-4-5");
  });

  it("clears env for custom keys after reset", () => {
    setSetting(db, "MY_CUSTOM_KEY", "value");
    assert.strictEqual(process.env.MY_CUSTOM_KEY, "value");
    resetSetting(db, "MY_CUSTOM_KEY");
    assert.strictEqual(process.env.MY_CUSTOM_KEY, undefined);
  });

  it("returns 0 for non-existent key", () => {
    const result = resetSetting(db, "NONEXISTENT");
    assert.strictEqual(result.deleted, 0);
  });

  it("unregisters custom secrets from scrub registry on reset", () => {
    setSetting(db, "MY_CUSTOM_SECRET", "long-secret-value-here", { secret: true });
    process.env.MY_CUSTOM_SECRET = "long-secret-value-here";
    const before = getSecretValues();
    assert.ok(before.includes("long-secret-value-here"));

    resetSetting(db, "MY_CUSTOM_SECRET");
    const after = getSecretValues();
    assert.ok(!after.includes("long-secret-value-here"));
  });
});
