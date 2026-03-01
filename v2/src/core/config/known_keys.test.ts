import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";

describe("KNOWN_CONFIG_KEYS", () => {
  it("contains exactly 14 system keys", () => {
    strictEqual(KNOWN_CONFIG_KEYS.length, 14);
  });

  it("has default_model in the model category", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "default_model");
    ok(key, "default_model exists");
    strictEqual(key.type, "string");
    strictEqual(key.category, "model");
    strictEqual(key.defaultValue, "claude-sonnet-4-6");
  });

  it("has max_tokens_per_session in the cost category", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_tokens_per_session");
    ok(key, "max_tokens_per_session exists");
    strictEqual(key.type, "integer");
    strictEqual(key.category, "cost");
    strictEqual(key.defaultValue, 200_000);
  });

  it("has max_tokens_per_day in the cost category", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_tokens_per_day");
    ok(key, "max_tokens_per_day exists");
    strictEqual(key.type, "integer");
    strictEqual(key.category, "cost");
    strictEqual(key.defaultValue, 1_000_000);
  });

  it("has warn_at_percentage in the cost category", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "warn_at_percentage");
    ok(key, "warn_at_percentage exists");
    strictEqual(key.type, "integer");
    strictEqual(key.category, "cost");
    strictEqual(key.defaultValue, 80);
  });

  it("has max_cost_per_day in the cost category", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_cost_per_day");
    ok(key, "max_cost_per_day exists");
    strictEqual(key.type, "number");
    strictEqual(key.category, "cost");
    strictEqual(key.defaultValue, 0);
  });

  it("every entry has a non-empty key, label, and description", () => {
    for (const k of KNOWN_CONFIG_KEYS) {
      ok(k.key.length > 0, `key must be non-empty: ${k.key}`);
      ok(k.label.length > 0, `label must be non-empty: ${k.label}`);
      ok(k.description.length > 0, `description must be non-empty: ${k.key}`);
    }
  });

  it("every entry has a unique key", () => {
    const keys = KNOWN_CONFIG_KEYS.map((k) => k.key);
    strictEqual(new Set(keys).size, keys.length);
  });

  it("no entry has category 'custom'", () => {
    for (const k of KNOWN_CONFIG_KEYS) {
      ok((k.category as string) !== "custom", `system key ${k.key} must not be 'custom'`);
    }
  });

  it("cost keys have validate functions", () => {
    const costKeys = KNOWN_CONFIG_KEYS.filter((k) => k.category === "cost");
    for (const k of costKeys) {
      ok(k.validate, `cost key ${k.key} should have a validate function`);
    }
  });

  it("max_tokens_per_session rejects zero and negative", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_tokens_per_session")!;
    ok(key.validate!(200_000));
    ok(key.validate!(1));
    ok(!key.validate!(0));
    ok(!key.validate!(-1));
  });

  it("max_tokens_per_day rejects zero and negative", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_tokens_per_day")!;
    ok(key.validate!(1_000_000));
    ok(key.validate!(1));
    ok(!key.validate!(0));
    ok(!key.validate!(-1));
  });

  it("warn_at_percentage accepts 0 through 100", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "warn_at_percentage")!;
    ok(key.validate!(0));
    ok(key.validate!(50));
    ok(key.validate!(100));
    ok(!key.validate!(-1));
    ok(!key.validate!(101));
  });

  it("max_cost_per_day accepts zero and positive, rejects negative", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "max_cost_per_day")!;
    ok(key.validate!(0));
    ok(key.validate!(5.5));
    ok(key.validate!(100));
    ok(!key.validate!(-0.01));
    ok(!key.validate!(-1));
  });

  it("default_model has no validate function", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "default_model")!;
    strictEqual(key.validate, undefined);
  });

  it("default values match the declared type", () => {
    for (const k of KNOWN_CONFIG_KEYS) {
      if (k.type === "string") {
        strictEqual(typeof k.defaultValue, "string", `${k.key} default should be string`);
      } else if (k.type === "integer" || k.type === "number") {
        strictEqual(typeof k.defaultValue, "number", `${k.key} default should be number`);
      } else if (k.type === "boolean") {
        strictEqual(typeof k.defaultValue, "boolean", `${k.key} default should be boolean`);
      }
    }
  });

  it("integer defaults are whole numbers", () => {
    for (const k of KNOWN_CONFIG_KEYS.filter((k) => k.type === "integer")) {
      ok(Number.isInteger(k.defaultValue), `${k.key} default should be an integer`);
    }
  });

  it("has 8 memory behavior keys", () => {
    const memKeys = KNOWN_CONFIG_KEYS.filter((k) => k.key.startsWith("memory_"));
    strictEqual(memKeys.length, 8);
    for (const k of memKeys) {
      strictEqual(k.category, "behavior");
      ok(k.validate, `memory key ${k.key} should have a validate function`);
    }
  });

  it("memory_half_life_days rejects zero and negative", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_half_life_days")!;
    ok(key.validate!(90));
    ok(key.validate!(0.5));
    ok(!key.validate!(0));
    ok(!key.validate!(-1));
  });

  it("memory_ema_alpha accepts (0, 1) exclusive", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_ema_alpha")!;
    ok(key.validate!(0.3));
    ok(key.validate!(0.01));
    ok(key.validate!(0.99));
    ok(!key.validate!(0));
    ok(!key.validate!(1));
    ok(!key.validate!(-0.1));
  });

  it("memory_max_confidence accepts (0, 1] inclusive on upper bound", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_max_confidence")!;
    ok(key.validate!(0.99));
    ok(key.validate!(1));
    ok(key.validate!(0.5));
    ok(!key.validate!(0));
    ok(!key.validate!(-0.1));
  });

  it("memory_recall_k rejects zero and negative", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_recall_k")!;
    ok(key.validate!(10));
    ok(key.validate!(1));
    ok(!key.validate!(0));
    ok(!key.validate!(-1));
    ok(!key.validate!(3.5));
  });

  it("memory_fallback_min_results accepts zero", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_fallback_min_results")!;
    ok(key.validate!(0));
    ok(key.validate!(3));
    ok(!key.validate!(-1));
    ok(!key.validate!(2.5));
  });

  it("memory_min_score accepts zero", () => {
    const key = KNOWN_CONFIG_KEYS.find((k) => k.key === "memory_min_score")!;
    ok(key.validate!(0));
    ok(key.validate!(0.01));
    ok(key.validate!(0.5));
    ok(!key.validate!(-0.01));
  });
});
