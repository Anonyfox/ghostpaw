import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleConfigGet } from "./handle_config_get.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("handleConfigGet", () => {
  it("returns default value for known key not in DB", () => {
    const result = handleConfigGet(db, "default_model");
    strictEqual(result.found, true);
    strictEqual(result.isDefault, true);
    strictEqual(result.value, "claude-sonnet-4-6");
    strictEqual(result.type, "string");
    strictEqual(result.category, "model");
    strictEqual(result.label, "Default Model");
    strictEqual(result.source, undefined);
  });

  it("returns overridden value for known key in DB", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const result = handleConfigGet(db, "default_model");
    strictEqual(result.found, true);
    strictEqual(result.isDefault, false);
    strictEqual(result.value, "gpt-4o");
    strictEqual(result.type, "string");
    strictEqual(result.category, "model");
    strictEqual(result.source, "cli");
    strictEqual(result.label, "Default Model");
  });

  it("returns typed value for known integer key", () => {
    setConfig(db, "compaction_threshold", 50000, "web");
    const result = handleConfigGet(db, "compaction_threshold");
    strictEqual(result.found, true);
    strictEqual(result.value, 50000);
    strictEqual(result.type, "integer");
    strictEqual(result.source, "web");
  });

  it("returns custom key value when set", () => {
    setConfig(db, "my_flag", true, "cli", "boolean");
    const result = handleConfigGet(db, "my_flag");
    strictEqual(result.found, true);
    strictEqual(result.isDefault, false);
    strictEqual(result.value, true);
    strictEqual(result.type, "boolean");
    strictEqual(result.category, "custom");
    strictEqual(result.label, undefined);
  });

  it("returns found=false for unknown custom key not in DB", () => {
    const result = handleConfigGet(db, "nonexistent");
    strictEqual(result.found, false);
    strictEqual(result.isDefault, false);
    strictEqual(result.value, undefined);
    strictEqual(result.type, undefined);
  });

  it("returns correct source from DB entry", () => {
    setConfig(db, "max_cost_per_day", 10, "web");
    const result = handleConfigGet(db, "max_cost_per_day");
    strictEqual(result.source, "web");

    setConfig(db, "max_cost_per_day", 20, "agent");
    const result2 = handleConfigGet(db, "max_cost_per_day");
    strictEqual(result2.source, "agent");
  });
});
