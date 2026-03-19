import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setConfig } from "../../core/config/api/write/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createListConfigTool } from "./list_config.ts";

describe("list_config tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, string | undefined>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    const tool = createListConfigTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("returns all known keys with defaults when nothing is set", async () => {
    const result = (await execute({})) as { entries: { key: string; source: string }[] };
    ok(Array.isArray(result.entries));
    ok(result.entries.length >= 5, "at least 5 known keys");
    const model = result.entries.find((e) => e.key === "default_model");
    ok(model);
    strictEqual(model.source, "default");
  });

  it("shows overridden values with their actual source", async () => {
    setConfig(db, "compaction_threshold", 50000, "web");
    const result = (await execute({})) as { entries: { key: string; source: string }[] };
    const entry = result.entries.find((e) => e.key === "compaction_threshold");
    strictEqual(entry?.source, "web");
  });

  it("includes custom keys", async () => {
    setConfig(db, "my.custom.key", "hello", "agent", "string");
    const result = (await execute({})) as {
      entries: { key: string; category: string }[];
    };
    const custom = result.entries.find((e) => e.key === "my.custom.key");
    ok(custom);
    strictEqual(custom.category, "custom");
  });

  it("filters by category when provided", async () => {
    setConfig(db, "my.custom", "test", "agent", "string");
    const result = (await execute({ category: "cost" })) as {
      entries: { key: string; category: string }[];
    };
    ok(result.entries.length > 0);
    ok(result.entries.every((e) => e.category === "cost"));
  });

  it("returns empty entries for invalid category filter", async () => {
    const result = (await execute({ category: "nonexistent" })) as {
      entries: { key: string }[];
    };
    strictEqual(result.entries.length, 0);
  });

  it("has a tool name and description", () => {
    const tool = createListConfigTool(db);
    strictEqual(tool.name, "list_config");
    ok(tool.description.length > 20);
  });
});
