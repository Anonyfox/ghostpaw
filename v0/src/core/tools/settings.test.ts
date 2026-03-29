import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { initSettingsTable } from "../settings/schema.ts";
import { clearSecretRegistry } from "../settings/scrub.ts";
import { createSettingsTool } from "./settings.ts";

describe("tools/settings", () => {
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
    delete process.env.CUSTOM_KEY;
    delete process.env.TOTALLY_UNKNOWN;
    delete process.env.MY_WEBHOOK_TOKEN;
  });

  async function exec(args: Record<string, unknown>) {
    const tool = createSettingsTool(db);
    return tool.execute({ args } as Parameters<typeof tool.execute>[0]);
  }

  it("list returns settings grouped by category", async () => {
    const result = (await exec({ action: "list" })) as Record<string, unknown>;
    assert.ok(result.settings);
    assert.ok((result.total as number) > 0);
  });

  it("set stores a value and get retrieves it", async () => {
    const setResult = (await exec({
      action: "set",
      key: "model",
      value: "gpt-5.4",
    })) as Record<string, unknown>;
    assert.strictEqual(setResult.ok, true);

    const getResult = (await exec({ action: "get", key: "model" })) as Record<string, unknown>;
    assert.strictEqual(getResult.value, "gpt-5.4");
  });

  it("get masks secret values", async () => {
    await exec({
      action: "set",
      key: "anthropic_api_key",
      value: "sk-ant-long-test-key",
    });
    const result = (await exec({ action: "get", key: "anthropic_api_key" })) as Record<
      string,
      unknown
    >;
    assert.strictEqual(result.value, "***");
    assert.strictEqual(result.secret, true);
  });

  it("reset removes a setting and returns to default", async () => {
    await exec({ action: "set", key: "model", value: "test" });
    const result = (await exec({ action: "reset", key: "model" })) as Record<string, unknown>;
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.action, "reset");
  });

  it("undo reverts to previous value", async () => {
    await exec({ action: "set", key: "model", value: "first" });
    await exec({ action: "set", key: "model", value: "second" });
    const result = (await exec({ action: "undo", key: "model" })) as Record<string, unknown>;
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.reverted_to, "first");
  });

  it("returns error for missing key on get", async () => {
    const result = (await exec({ action: "get" })) as Record<string, unknown>;
    assert.ok(result.error);
  });

  it("returns error for missing value on set", async () => {
    const result = (await exec({ action: "set", key: "model" })) as Record<string, unknown>;
    assert.ok(result.error);
  });

  it("returns error for unknown action", async () => {
    const result = (await exec({ action: "nope" })) as Record<string, unknown>;
    assert.ok(result.error);
  });

  it("set returns validation warning for cross-slot keys", async () => {
    const result = (await exec({
      action: "set",
      key: "anthropic_api_key",
      value: "xai-wrong-key-slot",
    })) as Record<string, unknown>;
    assert.ok(result.warning);
  });

  it("set with custom key and secret flag", async () => {
    const result = (await exec({
      action: "set",
      key: "custom_key",
      value: "custom_value",
      secret: true,
    })) as Record<string, unknown>;
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.secret, true);
  });

  it("get masks custom secrets set with secret flag", async () => {
    await exec({
      action: "set",
      key: "MY_WEBHOOK_TOKEN",
      value: "whsec_realvalue123456789",
      secret: true,
    });
    const result = (await exec({ action: "get", key: "MY_WEBHOOK_TOKEN" })) as Record<
      string,
      unknown
    >;
    assert.strictEqual(result.value, "***");
    assert.strictEqual(result.secret, true);
  });

  it("normalizes action casing (List, SET, Reset, etc.)", async () => {
    const list = (await exec({ action: "LIST" })) as Record<string, unknown>;
    assert.ok(list.settings);
    assert.strictEqual(list.action, "list");

    await exec({ action: "Set", key: "model", value: "test" });
    const get = (await exec({ action: "Get", key: "model" })) as Record<string, unknown>;
    assert.strictEqual(get.action, "get");
    assert.strictEqual(get.value, "test");
  });

  it("returns action echo on all success responses", async () => {
    const list = (await exec({ action: "list" })) as Record<string, unknown>;
    assert.strictEqual(list.action, "list");

    const set = (await exec({ action: "set", key: "model", value: "test" })) as Record<
      string,
      unknown
    >;
    assert.strictEqual(set.action, "set");

    const reset = (await exec({ action: "reset", key: "model" })) as Record<string, unknown>;
    assert.strictEqual(reset.action, "reset");
  });

  it("get returns error for unknown custom key", async () => {
    const result = (await exec({ action: "get", key: "totally_unknown" })) as Record<
      string,
      unknown
    >;
    assert.ok(result.error);
    assert.strictEqual(result.action, "get");
  });

  it("reset returns error for non-existent key", async () => {
    const result = (await exec({ action: "reset", key: "nonexistent" })) as Record<
      string,
      unknown
    >;
    assert.ok(result.error);
    assert.strictEqual(result.action, "reset");
  });

  it("undo returns error when nothing to undo", async () => {
    const result = (await exec({ action: "undo", key: "model" })) as Record<string, unknown>;
    assert.ok(result.error);
    assert.strictEqual(result.action, "undo");
  });

  it("returns error for empty key string", async () => {
    const result = (await exec({ action: "get", key: "" })) as Record<string, unknown>;
    assert.ok(result.error);
  });

  it("returns error for whitespace-only key", async () => {
    const result = (await exec({ action: "get", key: "   " })) as Record<string, unknown>;
    assert.ok(result.error);
  });

  it("accepts 'delete' as legacy alias for reset", async () => {
    await exec({ action: "set", key: "model", value: "test" });
    const result = (await exec({ action: "delete", key: "model" })) as Record<string, unknown>;
    assert.ok(result.error);
    assert.ok(String(result.error).includes("reset"));
  });
});
