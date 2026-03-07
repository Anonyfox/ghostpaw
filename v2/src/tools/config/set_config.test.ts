import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSetConfigTool } from "./set_config.ts";

describe("set_config tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, string>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    const tool = createSetConfigTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("sets a known key with type inference", async () => {
    const result = (await execute({ key: "compaction_threshold", value: "50000" })) as Record<
      string,
      unknown
    >;
    strictEqual(result.key, "compaction_threshold");
    strictEqual(result.value, 50000);
    strictEqual(result.type, "integer");
    strictEqual(getConfig(db, "compaction_threshold"), 50000);
  });

  it("sets a custom string key", async () => {
    const result = (await execute({ key: "my.preference", value: "dark" })) as Record<
      string,
      unknown
    >;
    strictEqual(result.key, "my.preference");
    strictEqual(result.value, "dark");
    strictEqual(result.type, "string");
  });

  it("infers boolean type from string value", async () => {
    const result = (await execute({ key: "verbose", value: "true" })) as Record<string, unknown>;
    strictEqual(result.value, true);
    strictEqual(result.type, "boolean");
  });

  it("infers number type from decimal value", async () => {
    const result = (await execute({ key: "temperature", value: "0.7" })) as Record<string, unknown>;
    strictEqual(result.value, 0.7);
    strictEqual(result.type, "number");
  });

  it("reports previous value on update", async () => {
    await execute({ key: "temperature", value: "0.5" });
    const result = (await execute({ key: "temperature", value: "0.7" })) as Record<string, unknown>;
    strictEqual(result.previous_value, "0.5");
    strictEqual(result.value, 0.7);
  });

  it("always uses 'agent' as source", async () => {
    await execute({ key: "my_flag", value: "true" });
    const entry = db
      .prepare("SELECT source FROM config WHERE key = ? AND next_id IS NULL")
      .get("my_flag");
    strictEqual(entry?.source, "agent");
  });

  it("validates known key constraints", async () => {
    const result = (await execute({ key: "compaction_threshold", value: "-100" })) as {
      error: string;
    };
    ok(result.error);
  });

  it("returns error for invalid type", async () => {
    const result = (await execute({ key: "compaction_threshold", value: "not_a_number" })) as {
      error: string;
    };
    ok(result.error);
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "", value: "test" })) as { error: string };
    ok(result.error);
  });

  it("returns error for empty value", async () => {
    const result = (await execute({ key: "test", value: "" })) as { error: string };
    ok(result.error);
  });

  it("infers integer type for whole number strings", async () => {
    const result = (await execute({ key: "port", value: "8080" })) as Record<string, unknown>;
    strictEqual(result.value, 8080);
    strictEqual(result.type, "integer");
  });

  it("has a tool name and description", () => {
    const tool = createSetConfigTool(db);
    strictEqual(tool.name, "set_config");
    ok(tool.description.length > 20);
  });
});
