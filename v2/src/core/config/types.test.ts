import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type {
  ConfigCategory,
  ConfigEntry,
  ConfigSource,
  ConfigType,
  ConfigValue,
  KnownConfigKey,
} from "./types.ts";
import { CONFIG_CATEGORIES, CONFIG_SOURCES, CONFIG_TYPES } from "./types.ts";

describe("CONFIG_TYPES", () => {
  it("contains exactly the four primitive types", () => {
    deepStrictEqual(CONFIG_TYPES, ["string", "integer", "number", "boolean"]);
  });

  it("every element is a unique string", () => {
    strictEqual(new Set(CONFIG_TYPES).size, CONFIG_TYPES.length);
  });
});

describe("CONFIG_CATEGORIES", () => {
  it("contains model, cost, behavior, souls, and custom", () => {
    ok(CONFIG_CATEGORIES.includes("model"));
    ok(CONFIG_CATEGORIES.includes("cost"));
    ok(CONFIG_CATEGORIES.includes("behavior"));
    ok(CONFIG_CATEGORIES.includes("souls"));
    ok(CONFIG_CATEGORIES.includes("custom"));
  });

  it("custom is included as the catch-all for user keys", () => {
    ok(CONFIG_CATEGORIES.includes("custom"));
  });

  it("every element is a unique string", () => {
    strictEqual(new Set(CONFIG_CATEGORIES).size, CONFIG_CATEGORIES.length);
  });
});

describe("CONFIG_SOURCES", () => {
  it("contains cli, web, agent, env, and import", () => {
    deepStrictEqual(CONFIG_SOURCES, ["cli", "web", "agent", "env", "import", "default"]);
  });

  it("every element is a unique string", () => {
    strictEqual(new Set(CONFIG_SOURCES).size, CONFIG_SOURCES.length);
  });
});

describe("type compatibility", () => {
  it("ConfigType elements are assignable to the union", () => {
    const t: ConfigType = CONFIG_TYPES[0]!;
    ok(typeof t === "string");
  });

  it("ConfigCategory elements are assignable to the union", () => {
    const c: ConfigCategory = CONFIG_CATEGORIES[0]!;
    ok(typeof c === "string");
  });

  it("ConfigSource elements are assignable to the union", () => {
    const s: ConfigSource = CONFIG_SOURCES[0]!;
    ok(typeof s === "string");
  });

  it("ConfigValue accepts string, number, and boolean", () => {
    const values: ConfigValue[] = ["hello", 42, 3.14, true, false];
    strictEqual(values.length, 5);
  });

  it("ConfigEntry has all required fields", () => {
    const entry: ConfigEntry = {
      id: 1,
      key: "test_key",
      value: "test_value",
      type: "string",
      category: "custom",
      source: "cli",
      nextId: null,
      updatedAt: Date.now(),
    };
    strictEqual(entry.key, "test_key");
    strictEqual(entry.nextId, null);
  });

  it("ConfigEntry nextId can be a number", () => {
    const entry: ConfigEntry = {
      id: 2,
      key: "k",
      value: "v",
      type: "string",
      category: "custom",
      source: "web",
      nextId: 1,
      updatedAt: Date.now(),
    };
    strictEqual(entry.nextId, 1);
  });

  it("KnownConfigKey has all required fields", () => {
    const key: KnownConfigKey = {
      key: "default_model",
      type: "string",
      defaultValue: "claude-sonnet-4-6",
      category: "model",
      label: "Default Model",
      description: "LLM model identifier used for new sessions.",
    };
    strictEqual(key.key, "default_model");
    strictEqual(key.validate, undefined);
  });

  it("KnownConfigKey accepts an optional validate function", () => {
    const key: KnownConfigKey = {
      key: "max_cost",
      type: "number",
      defaultValue: 0,
      category: "cost",
      label: "Max Cost Per Day",
      description: "Daily spend cap in USD. Zero means no cap.",
      validate: (v) => (v as number) >= 0,
    };
    ok(key.validate!(0));
    ok(!key.validate!(-1));
  });
});
