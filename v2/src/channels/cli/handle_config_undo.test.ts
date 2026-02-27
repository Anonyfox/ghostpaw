import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { handleConfigUndo } from "./handle_config_undo.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("handleConfigUndo", () => {
  it("restores previous value when predecessor exists", () => {
    setConfig(db, "max_cost_per_day", 5.5, "cli");
    setConfig(db, "max_cost_per_day", 10, "cli");
    const result = handleConfigUndo(db, "max_cost_per_day");
    strictEqual(result.success, true);
    strictEqual(result.previousValue, 10);
    strictEqual(result.restoredValue, 5.5);
    strictEqual(result.restoredToDefault, false);
    strictEqual(getConfig(db, "max_cost_per_day"), 5.5);
  });

  it("restores to default when last entry is removed for known key", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const result = handleConfigUndo(db, "default_model");
    strictEqual(result.success, true);
    strictEqual(result.previousValue, "gpt-4o");
    strictEqual(result.restoredValue, "claude-sonnet-4-6");
    strictEqual(result.restoredToDefault, true);
    strictEqual(result.isKnown, true);
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
  });

  it("removes custom key when last entry is undone", () => {
    setConfig(db, "my_flag", true, "cli", "boolean");
    const result = handleConfigUndo(db, "my_flag");
    strictEqual(result.success, true);
    strictEqual(result.previousValue, true);
    strictEqual(result.restoredToDefault, true);
    strictEqual(result.isKnown, false);
    strictEqual(result.restoredValue, undefined);
    strictEqual(getConfig(db, "my_flag"), null);
  });

  it("returns success=false for key with no history", () => {
    const result = handleConfigUndo(db, "nonexistent");
    strictEqual(result.success, false);
    strictEqual(result.key, "nonexistent");
  });

  it("returns success=false for known key at default", () => {
    const result = handleConfigUndo(db, "default_model");
    strictEqual(result.success, false);
  });

  it("walks back multiple changes correctly", () => {
    setConfig(db, "max_cost_per_day", 1, "cli");
    setConfig(db, "max_cost_per_day", 2, "cli");
    setConfig(db, "max_cost_per_day", 3, "cli");

    const r1 = handleConfigUndo(db, "max_cost_per_day");
    strictEqual(r1.success, true);
    strictEqual(r1.restoredValue, 2);

    const r2 = handleConfigUndo(db, "max_cost_per_day");
    strictEqual(r2.success, true);
    strictEqual(r2.restoredValue, 1);

    const r3 = handleConfigUndo(db, "max_cost_per_day");
    strictEqual(r3.success, true);
    strictEqual(r3.restoredToDefault, true);
    strictEqual(r3.restoredValue, 0);

    const r4 = handleConfigUndo(db, "max_cost_per_day");
    strictEqual(r4.success, false);
  });
});
