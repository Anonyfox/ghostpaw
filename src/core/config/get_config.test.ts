import { strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getConfig } from "./get_config.ts";
import { initConfigTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function insertCurrent(
  key: string,
  value: string,
  type: string = "string",
  category: string = "custom",
) {
  db.prepare(
    "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(key, value, type, category, "cli", Date.now());
}

describe("getConfig", () => {
  it("returns code default for known key with no DB entry", () => {
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
  });

  it("returns code default for compaction_threshold with no DB entry", () => {
    strictEqual(getConfig(db, "compaction_threshold"), 200_000);
  });

  it("returns code default for max_cost_per_day with no DB entry", () => {
    strictEqual(getConfig(db, "max_cost_per_day"), 0);
  });

  it("returns code default for warn_at_percentage with no DB entry", () => {
    strictEqual(getConfig(db, "warn_at_percentage"), 80);
  });

  it("returns null for unknown custom key with no DB entry", () => {
    strictEqual(getConfig(db, "nonexistent_custom_key"), null);
  });

  it("returns the DB value for a known key when set", () => {
    insertCurrent("default_model", "gpt-4o", "string", "model");
    strictEqual(getConfig(db, "default_model"), "gpt-4o");
  });

  it("returns a typed integer from DB for integer keys", () => {
    insertCurrent("compaction_threshold", "500000", "integer", "cost");
    const result = getConfig(db, "compaction_threshold");
    strictEqual(result, 500_000);
    strictEqual(typeof result, "number");
  });

  it("returns a typed number from DB for number keys", () => {
    insertCurrent("max_cost_per_day", "5.5", "number", "cost");
    const result = getConfig(db, "max_cost_per_day");
    strictEqual(result, 5.5);
    strictEqual(typeof result, "number");
  });

  it("returns a typed boolean from DB for boolean keys", () => {
    insertCurrent("my_flag", "true", "boolean");
    strictEqual(getConfig(db, "my_flag"), true);
  });

  it("returns false boolean from DB", () => {
    insertCurrent("my_flag", "false", "boolean");
    strictEqual(getConfig(db, "my_flag"), false);
  });

  it("returns a string from DB for custom string keys", () => {
    insertCurrent("my_custom", "hello world");
    strictEqual(getConfig(db, "my_custom"), "hello world");
  });

  it("uses code-defined type for known keys, ignoring DB type column", () => {
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("compaction_threshold", "300000", "string", "cost", "cli", Date.now());
    const result = getConfig(db, "compaction_threshold");
    strictEqual(result, 300_000);
    strictEqual(typeof result, "number");
  });

  it("falls back to code default when DB value is corrupt for known key", () => {
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("compaction_threshold", "not-a-number", "integer", "cost", "cli", Date.now());
    strictEqual(getConfig(db, "compaction_threshold"), 200_000);
  });

  it("throws when custom key DB value is corrupt and unparseable", () => {
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("my_int", "banana", "integer", "custom", "cli", Date.now());
    throws(() => getConfig(db, "my_int"), /not a valid integer/i);
  });

  it("only returns the current value (next_id IS NULL), not historical", () => {
    const r1 = db
      .prepare(
        "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("my_key", "old_value", "string", "custom", "cli", Date.now());
    const r2 = db
      .prepare(
        "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("my_key", "new_value", "string", "custom", "cli", Date.now());
    db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(
      r2.lastInsertRowid,
      r1.lastInsertRowid,
    );

    strictEqual(getConfig(db, "my_key"), "new_value");
  });
});
