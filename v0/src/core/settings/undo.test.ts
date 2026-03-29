import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry, getSecretValues } from "./scrub.ts";
import { setSetting } from "./set.ts";
import { undoSetting } from "./undo.ts";

describe("settings/undo", () => {
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

  it("reverts to predecessor value", () => {
    setSetting(db, "GHOSTPAW_MODEL", "first");
    setSetting(db, "GHOSTPAW_MODEL", "second");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "second");
    const result = undoSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(result.undone, true);
    assert.strictEqual(result.previousValue, "first");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "first");
  });

  it("reverts to known default when single row", () => {
    setSetting(db, "GHOSTPAW_MODEL", "custom");
    const result = undoSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(result.undone, true);
    assert.strictEqual(result.previousValue, undefined);
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "claude-sonnet-4-5");
  });

  it("clears env for custom keys with no predecessor", () => {
    setSetting(db, "MY_CUSTOM_KEY", "value");
    undoSetting(db, "MY_CUSTOM_KEY");
    assert.strictEqual(process.env.MY_CUSTOM_KEY, undefined);
  });

  it("returns undone=false for non-existent key", () => {
    const result = undoSetting(db, "NONEXISTENT");
    assert.strictEqual(result.undone, false);
  });

  it("maintains correct chain after undo", () => {
    setSetting(db, "GHOSTPAW_MODEL", "a");
    setSetting(db, "GHOSTPAW_MODEL", "b");
    setSetting(db, "GHOSTPAW_MODEL", "c");
    undoSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "b");
    undoSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "a");
    undoSetting(db, "GHOSTPAW_MODEL");
    assert.strictEqual(process.env.GHOSTPAW_MODEL, "claude-sonnet-4-5");
  });

  it("unregisters custom secrets from scrub registry on full undo", () => {
    setSetting(db, "MY_CUSTOM_SECRET", "long-secret-value-here", { secret: true });
    process.env.MY_CUSTOM_SECRET = "long-secret-value-here";
    const before = getSecretValues();
    assert.ok(before.includes("long-secret-value-here"));

    undoSetting(db, "MY_CUSTOM_SECRET");
    const after = getSecretValues();
    assert.ok(!after.includes("long-secret-value-here"));
  });
});
