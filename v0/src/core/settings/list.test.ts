import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { listSettings } from "./list.ts";
import { initSettingsTable } from "./schema.ts";
import { clearSecretRegistry } from "./scrub.ts";
import { setSetting } from "./set.ts";

describe("settings/list", () => {
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
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns known defaults for empty database", () => {
    const entries = listSettings(db);
    assert.ok(entries.length > 0);
    const modelEntry = entries.find((e) => e.key === "GHOSTPAW_MODEL");
    assert.ok(modelEntry);
    assert.strictEqual(modelEntry.value, "claude-sonnet-4-5");
    assert.strictEqual(modelEntry.isDefault, true);
    assert.strictEqual(modelEntry.source, "default");
  });

  it("returns DB values overriding defaults", () => {
    setSetting(db, "GHOSTPAW_MODEL", "gpt-5.4");
    const entries = listSettings(db);
    const modelEntry = entries.find((e) => e.key === "GHOSTPAW_MODEL");
    assert.ok(modelEntry);
    assert.strictEqual(modelEntry.value, "gpt-5.4");
    assert.strictEqual(modelEntry.isDefault, false);
  });

  it("masks secret values", () => {
    setSetting(db, "ANTHROPIC_API_KEY", "sk-ant-super-secret-long");
    const entries = listSettings(db);
    const keyEntry = entries.find((e) => e.key === "ANTHROPIC_API_KEY");
    assert.ok(keyEntry);
    assert.strictEqual(keyEntry.value, "***");
    assert.strictEqual(keyEntry.masked, true);
  });

  it("does not include known secrets without defaults or DB values", () => {
    const entries = listSettings(db);
    const keyEntry = entries.find((e) => e.key === "ANTHROPIC_API_KEY");
    assert.strictEqual(keyEntry, undefined);
  });

  it("sorts by category then key", () => {
    const entries = listSettings(db);
    for (let i = 1; i < entries.length; i++) {
      const cmp = entries[i - 1].category.localeCompare(entries[i].category);
      if (cmp === 0) {
        assert.ok(entries[i - 1].key.localeCompare(entries[i].key) <= 0);
      } else {
        assert.ok(cmp < 0);
      }
    }
  });
});
