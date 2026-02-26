import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { handleConfigReset } from "./handle_config_reset.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("handleConfigReset", () => {
  it("resets overridden known key to default", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const result = handleConfigReset(db, "default_model");
    strictEqual(result.wasOverridden, true);
    strictEqual(result.isKnown, true);
    strictEqual(result.defaultValue, "claude-sonnet-4-6");
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
  });

  it("reports known key already at default", () => {
    const result = handleConfigReset(db, "default_model");
    strictEqual(result.wasOverridden, false);
    strictEqual(result.isKnown, true);
    strictEqual(result.defaultValue, "claude-sonnet-4-6");
  });

  it("removes custom key that existed", () => {
    setConfig(db, "my_flag", true, "cli", "boolean");
    const result = handleConfigReset(db, "my_flag");
    strictEqual(result.wasOverridden, true);
    strictEqual(result.isKnown, false);
    strictEqual(result.defaultValue, undefined);
    strictEqual(getConfig(db, "my_flag"), null);
  });

  it("reports custom key that does not exist", () => {
    const result = handleConfigReset(db, "nonexistent");
    strictEqual(result.wasOverridden, false);
    strictEqual(result.isKnown, false);
    strictEqual(result.defaultValue, undefined);
  });

  it("clears entire history chain for a key", () => {
    setConfig(db, "default_model", "a", "cli");
    setConfig(db, "default_model", "b", "cli");
    setConfig(db, "default_model", "c", "cli");
    handleConfigReset(db, "default_model");
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
    const count = db.prepare("SELECT COUNT(*) as c FROM config WHERE key = ?").get("default_model");
    strictEqual((count as { c: number }).c, 0);
  });
});
