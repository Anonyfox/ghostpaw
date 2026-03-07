import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createGetConfigTool } from "./get_config.ts";

describe("get_config tool", () => {
  let db: DatabaseHandle;
  let execute: (args: { key: string }) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    const tool = createGetConfigTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("returns a known key with its default value when not overridden", async () => {
    const result = (await execute({ key: "default_model" })) as Record<string, unknown>;
    strictEqual(result.key, "default_model");
    strictEqual(result.type, "string");
    strictEqual(result.category, "model");
    strictEqual(result.source, "default");
    ok(typeof result.value === "string");
  });

  it("returns an overridden known key with its set value and source", async () => {
    setConfig(db, "compaction_threshold", 50000, "web");
    const result = (await execute({ key: "compaction_threshold" })) as Record<string, unknown>;
    strictEqual(result.value, 50000);
    strictEqual(result.source, "web");
    strictEqual(result.type, "integer");
  });

  it("returns a custom key that exists", async () => {
    setConfig(db, "my_preference", "dark", "agent", "string");
    const result = (await execute({ key: "my_preference" })) as Record<string, unknown>;
    strictEqual(result.value, "dark");
    strictEqual(result.category, "custom");
  });

  it("returns error for unknown key that does not exist", async () => {
    const result = (await execute({ key: "nonexistent_key" })) as { error: string };
    ok(result.error);
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "" })) as { error: string };
    ok(result.error);
  });

  it("returns error for whitespace-only key", async () => {
    const result = (await execute({ key: "   " })) as { error: string };
    ok(result.error);
  });

  it("has a tool name and description", () => {
    const tool = createGetConfigTool(db);
    strictEqual(tool.name, "get_config");
    ok(tool.description.length > 20);
  });
});
