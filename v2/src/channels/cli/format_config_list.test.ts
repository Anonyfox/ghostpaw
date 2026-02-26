import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable, setConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { formatConfigList } from "./format_config_list.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("formatConfigList", () => {
  it("returns lines with all known key defaults", () => {
    const lines = formatConfigList(db);
    ok(Array.isArray(lines));
    ok(lines.length > 0);
    const text = lines.join("\n");
    ok(text.includes("default_model"), "Should show default_model");
    ok(text.includes("max_cost_per_day"), "Should show max_cost_per_day");
  });

  it("shows checkmark for overridden keys", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const lines = formatConfigList(db);
    const modelLine = lines.find((l) => l.includes("default_model") && l.includes("gpt-4o"));
    ok(modelLine, "Should show overridden value");
  });

  it("shows custom keys in custom category", () => {
    setConfig(db, "my_flag", true, "cli", "boolean");
    const lines = formatConfigList(db);
    const text = lines.join("\n");
    ok(text.includes("custom"), "Should show custom category");
    ok(text.includes("my_flag"), "Should show custom key");
  });

  it("filters by category", () => {
    setConfig(db, "my_flag", true, "cli", "boolean");
    const costLines = formatConfigList(db, "cost");
    const text = costLines.join("\n");
    ok(text.includes("max_cost_per_day"), "Should include cost keys");
    ok(!text.includes("default_model"), "Should not include model keys");
    ok(!text.includes("my_flag"), "Should not include custom keys");
  });

  it("shows source for overridden keys", () => {
    setConfig(db, "default_model", "gpt-4o", "web");
    const lines = formatConfigList(db);
    const modelLine = lines.find((l) => l.includes("default_model"));
    ok(modelLine);
    ok(modelLine.includes("web"), "Should show source");
  });

  it("shows default indicator for non-overridden keys", () => {
    const lines = formatConfigList(db);
    const modelLine = lines.find((l) => l.includes("default_model"));
    ok(modelLine);
    ok(modelLine.includes("default"), "Should indicate default");
  });

  it("includes usage hint", () => {
    const lines = formatConfigList(db);
    const hint = lines.find((l) => l.includes("ghostpaw config set"));
    ok(hint);
  });

  it("shows string values quoted, numbers unquoted", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    setConfig(db, "max_cost_per_day", 10.5, "cli");
    const lines = formatConfigList(db);
    const modelLine = lines.find((l) => l.includes("default_model"));
    ok(modelLine);
    ok(modelLine.includes('"gpt-4o"'), "String value should be quoted");
    const costLine = lines.find((l) => l.includes("max_cost_per_day"));
    ok(costLine);
    ok(costLine.includes("10.5"), "Number value should not be quoted");
  });

  it("returns empty-state message when category filter yields nothing", () => {
    const lines = formatConfigList(db, "custom");
    const text = lines.join("\n");
    ok(text.includes("No configuration entries found"));
  });
});
