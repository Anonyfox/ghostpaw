import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { handleConfigSet } from "./handle_config_set.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("handleConfigSet", () => {
  it("sets a known key and returns success", () => {
    const result = handleConfigSet(db, "default_model", "gpt-4o");
    strictEqual(result.success, true);
    strictEqual(result.key, "default_model");
    strictEqual(result.type, "string");
    strictEqual(result.newValue, "gpt-4o");
    strictEqual(getConfig(db, "default_model"), "gpt-4o");
  });

  it("sets a known integer key by parsing the string", () => {
    const result = handleConfigSet(db, "max_tokens_per_session", "50000");
    strictEqual(result.success, true);
    strictEqual(result.type, "integer");
    strictEqual(getConfig(db, "max_tokens_per_session"), 50000);
  });

  it("sets a known number key by parsing the string", () => {
    const result = handleConfigSet(db, "max_cost_per_day", "5.5");
    strictEqual(result.success, true);
    strictEqual(result.type, "number");
    strictEqual(getConfig(db, "max_cost_per_day"), 5.5);
  });

  it("returns previous value when overwriting", () => {
    setConfig(db, "default_model", "old-model", "cli");
    const result = handleConfigSet(db, "default_model", "new-model");
    strictEqual(result.success, true);
    strictEqual(result.previousValue, "old-model");
    strictEqual(result.newValue, "new-model");
  });

  it("returns no previous value on first set", () => {
    const result = handleConfigSet(db, "default_model", "gpt-4o");
    strictEqual(result.previousValue, undefined);
  });

  it("returns error for type mismatch on known key", () => {
    const result = handleConfigSet(db, "max_cost_per_day", "banana");
    strictEqual(result.success, false);
    ok(result.error);
    ok(result.error.includes("number"));
    ok(result.error.includes("banana"));
  });

  it("returns error for constraint violation on known key", () => {
    const result = handleConfigSet(db, "warn_at_percentage", "150");
    strictEqual(result.success, false);
    ok(result.error);
  });

  it("infers boolean type for custom key with true/false value", () => {
    const result = handleConfigSet(db, "my_flag", "true");
    strictEqual(result.success, true);
    strictEqual(result.type, "boolean");
    strictEqual(getConfig(db, "my_flag"), true);
  });

  it("infers integer type for custom key with digit value", () => {
    const result = handleConfigSet(db, "batch_size", "32");
    strictEqual(result.success, true);
    strictEqual(result.type, "integer");
    strictEqual(getConfig(db, "batch_size"), 32);
  });

  it("infers number type for custom key with decimal value", () => {
    const result = handleConfigSet(db, "threshold", "0.95");
    strictEqual(result.success, true);
    strictEqual(result.type, "number");
    strictEqual(getConfig(db, "threshold"), 0.95);
  });

  it("infers string type for custom key with plain text", () => {
    const result = handleConfigSet(db, "greeting", "hello world");
    strictEqual(result.success, true);
    strictEqual(result.type, "string");
    strictEqual(getConfig(db, "greeting"), "hello world");
  });

  it("respects --type override for custom keys", () => {
    const result = handleConfigSet(db, "port", "8080", "string");
    strictEqual(result.success, true);
    strictEqual(result.type, "string");
    strictEqual(getConfig(db, "port"), "8080");
  });

  it("ignores --type override for known keys, uses code-defined type", () => {
    const result = handleConfigSet(db, "max_cost_per_day", "5.5", "string");
    strictEqual(result.success, true);
    strictEqual(result.type, "number");
    strictEqual(getConfig(db, "max_cost_per_day"), 5.5);
  });

  it("handles negative number values", () => {
    const result = handleConfigSet(db, "offset", "-5");
    strictEqual(result.success, true);
    strictEqual(result.type, "integer");
    strictEqual(getConfig(db, "offset"), -5);
  });
});
