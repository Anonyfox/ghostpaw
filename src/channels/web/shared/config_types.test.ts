import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConfigInfo } from "./config_types.ts";

describe("ConfigInfo", () => {
  it("accepts a complete entry with all required fields", () => {
    const info: ConfigInfo = {
      key: "default_model",
      value: "claude-sonnet-4-6",
      type: "string",
      category: "model",
      source: "default",
      isDefault: true,
      label: "Default Model",
    };
    strictEqual(info.key, "default_model");
    strictEqual(info.isDefault, true);
  });

  it("accepts an entry without optional label", () => {
    const info: ConfigInfo = {
      key: "my_custom",
      value: "42",
      type: "integer",
      category: "custom",
      source: "agent",
      isDefault: false,
    };
    strictEqual(info.label, undefined);
    ok(!info.isDefault);
  });

  it("enforces narrow type unions at compile time", () => {
    const info: ConfigInfo = {
      key: "flag",
      value: "true",
      type: "boolean",
      category: "behavior",
      source: "web",
      isDefault: false,
    };
    strictEqual(info.type, "boolean");
    strictEqual(info.source, "web");
  });
});
