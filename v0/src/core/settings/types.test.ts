import assert from "node:assert";
import { describe, it } from "node:test";
import type { KnownSetting, Setting } from "./types.ts";
import { CATEGORIES } from "./types.ts";

describe("settings/types", () => {
  it("CATEGORIES contains all expected categories", () => {
    assert.deepStrictEqual(
      [...CATEGORIES],
      ["provider", "search", "channel", "model", "agent", "interceptor", "pulse", "tools"],
    );
  });

  it("types are structurally sound", () => {
    const setting: Setting = {
      id: 1,
      key: "GHOSTPAW_MODEL",
      value: "claude-sonnet-4-5",
      type: "string",
      secret: false,
      source: "user",
      next_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    assert.strictEqual(setting.key, "GHOSTPAW_MODEL");
    assert.strictEqual(setting.secret, false);
    assert.strictEqual(setting.next_id, null);
  });

  it("KnownSetting accepts optional defaultValue", () => {
    const withDefault: KnownSetting = {
      defaultValue: "25",
      type: "integer",
      secret: false,
      category: "agent",
      description: "test",
    };
    assert.strictEqual(withDefault.defaultValue, "25");

    const withoutDefault: KnownSetting = {
      type: "string",
      secret: true,
      category: "provider",
      description: "test",
    };
    assert.strictEqual(withoutDefault.defaultValue, undefined);
  });
});
