import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";
import { listConfig } from "./list_config.ts";
import { initConfigTable } from "./schema.ts";
import { setConfig } from "./set_config.ts";
import type { ConfigEntry } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("listConfig", () => {
  it("returns all known keys with defaults when DB is empty", () => {
    const entries = listConfig(db);
    strictEqual(entries.length, KNOWN_CONFIG_KEYS.length);
    for (const known of KNOWN_CONFIG_KEYS) {
      const entry = entries.find((e) => e.key === known.key);
      ok(entry, `${known.key} should be present`);
      strictEqual(entry.category, known.category);
      strictEqual(entry.type, known.type);
    }
  });

  it("default entries have id 0, source 'default', and null nextId", () => {
    const entries = listConfig(db);
    for (const entry of entries) {
      strictEqual(entry.id, 0);
      strictEqual(entry.source, "default" as ConfigEntry["source"]);
      strictEqual(entry.nextId, null);
    }
  });

  it("default_model has the correct default value serialized", () => {
    const entries = listConfig(db);
    const model = entries.find((e) => e.key === "default_model");
    ok(model);
    strictEqual(model.value, "claude-sonnet-4-6");
  });

  it("compaction_threshold has the correct default value serialized", () => {
    const entries = listConfig(db);
    const entry = entries.find((e) => e.key === "compaction_threshold");
    ok(entry);
    strictEqual(entry.value, "200000");
  });

  it("overridden known key shows the DB value, not the default", () => {
    setConfig(db, "default_model", "gpt-4o", "web");
    const entries = listConfig(db);
    const model = entries.find((e) => e.key === "default_model");
    ok(model);
    strictEqual(model.value, "gpt-4o");
    strictEqual(model.source, "web");
    ok(model.id > 0);
  });

  it("includes custom keys from the DB", () => {
    setConfig(db, "my_custom", "hello", "cli");
    const entries = listConfig(db);
    const custom = entries.find((e) => e.key === "my_custom");
    ok(custom);
    strictEqual(custom.value, "hello");
    strictEqual(custom.category, "custom");
  });

  it("includes both known defaults and custom keys", () => {
    setConfig(db, "my_custom", "val", "cli");
    const entries = listConfig(db);
    ok(entries.length >= KNOWN_CONFIG_KEYS.length + 1);
    ok(entries.find((e) => e.key === "default_model"));
    ok(entries.find((e) => e.key === "my_custom"));
  });

  it("only returns current entries (next_id IS NULL), not historical ones", () => {
    setConfig(db, "default_model", "v1", "cli");
    setConfig(db, "default_model", "v2", "web");
    const entries = listConfig(db);
    const models = entries.filter((e) => e.key === "default_model");
    strictEqual(models.length, 1);
    strictEqual(models[0]!.value, "v2");
  });

  it("sorts entries by category then key", () => {
    setConfig(db, "z_custom", "z", "cli");
    setConfig(db, "a_custom", "a", "cli");
    const entries = listConfig(db);
    const keys = entries.map((e) => e.key);

    const categoryOrder = entries.map((e) => e.category);
    for (let i = 1; i < categoryOrder.length; i++) {
      const prev = categoryOrder[i - 1]!;
      const curr = categoryOrder[i]!;
      if (prev === curr) {
        ok(keys[i - 1]! <= keys[i]!, `within same category, keys should be sorted`);
      }
    }
  });

  it("multiple custom keys are all included", () => {
    setConfig(db, "key_a", "a", "cli");
    setConfig(db, "key_b", "b", "web");
    setConfig(db, "key_c", "c", "agent");
    const entries = listConfig(db);
    const customKeys = entries.filter((e) => e.category === "custom").map((e) => e.key);
    ok(customKeys.includes("key_a"));
    ok(customKeys.includes("key_b"));
    ok(customKeys.includes("key_c"));
  });
});
