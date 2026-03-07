import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getConfig, initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createUndoConfigTool } from "./undo_config.ts";

describe("undo_config tool", () => {
  let db: DatabaseHandle;
  let execute: (args: { key: string }) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    const tool = createUndoConfigTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("undoes the last change and reports both values", async () => {
    setConfig(db, "temperature", 0.5, "agent", "number");
    setConfig(db, "temperature", 0.9, "agent", "number");
    const result = (await execute({ key: "temperature" })) as Record<string, unknown>;
    strictEqual(result.undone, true);
    strictEqual(result.previous_value, 0.9);
    strictEqual(result.restored_value, 0.5);
  });

  it("restores to default when undoing the only override", async () => {
    setConfig(db, "compaction_threshold", 50000, "agent");
    const result = (await execute({ key: "compaction_threshold" })) as Record<string, unknown>;
    strictEqual(result.undone, true);
    strictEqual(result.restored_to_default, true);
    strictEqual(getConfig(db, "compaction_threshold"), 200_000);
  });

  it("returns error when key has no history", async () => {
    const result = (await execute({ key: "default_model" })) as { error: string };
    ok(result.error);
  });

  it("returns error for unknown key with no history", async () => {
    const result = (await execute({ key: "nonexistent" })) as { error: string };
    ok(result.error);
  });

  it("returns error for empty key", async () => {
    const result = (await execute({ key: "" })) as { error: string };
    ok(result.error);
  });

  it("has a tool name and description", () => {
    const tool = createUndoConfigTool(db);
    strictEqual(tool.name, "undo_config");
    ok(tool.description.length > 20);
  });
});
