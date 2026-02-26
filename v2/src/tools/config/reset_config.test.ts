import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { createResetConfigTool } from "./reset_config.ts";

describe("reset_config tool", () => {
  let db: DatabaseHandle;
  let execute: (args: { key: string }) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    const tool = createResetConfigTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("resets a known key to its default value", async () => {
    setConfig(db, "max_tokens_per_session", 50000, "agent");
    const result = (await execute({ key: "max_tokens_per_session" })) as Record<string, unknown>;
    strictEqual(result.reset, true);
    strictEqual(result.default_value, 200_000);
    strictEqual(getConfig(db, "max_tokens_per_session"), 200_000);
  });

  it("removes a custom key entirely", async () => {
    setConfig(db, "my.custom", "hello", "agent", "string");
    const result = (await execute({ key: "my.custom" })) as Record<string, unknown>;
    strictEqual(result.reset, true);
    strictEqual(result.removed, true);
    strictEqual(getConfig(db, "my.custom"), null);
  });

  it("reports no-op when known key is already at default", async () => {
    const result = (await execute({ key: "default_model" })) as Record<string, unknown>;
    strictEqual(result.reset, true);
    strictEqual(result.was_default, true);
  });

  it("returns error for unknown key that does not exist", async () => {
    const result = (await execute({ key: "nonexistent" })) as { error: string };
    ok(result.error);
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "" })) as { error: string };
    ok(result.error);
  });

  it("has a tool name and description", () => {
    const tool = createResetConfigTool(db);
    strictEqual(tool.name, "reset_config");
    ok(tool.description.length > 20);
  });
});
