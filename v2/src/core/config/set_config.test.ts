import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getConfig } from "./get_config.ts";
import { getCurrentEntry } from "./get_current_entry.ts";
import { initConfigTable } from "./schema.ts";
import { setConfig } from "./set_config.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("setConfig", () => {
  it("stores a string value for a known key", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    strictEqual(getConfig(db, "default_model"), "gpt-4o");
  });

  it("stores an integer value for a known key", () => {
    setConfig(db, "max_tokens_per_session", 500_000, "web");
    strictEqual(getConfig(db, "max_tokens_per_session"), 500_000);
  });

  it("stores a number value for a known key", () => {
    setConfig(db, "max_cost_per_day", 5.5, "agent");
    strictEqual(getConfig(db, "max_cost_per_day"), 5.5);
  });

  it("stores a custom string key", () => {
    setConfig(db, "my_custom", "hello", "cli");
    strictEqual(getConfig(db, "my_custom"), "hello");
  });

  it("stores a custom integer key with explicit type", () => {
    setConfig(db, "batch_size", 32, "cli", "integer");
    strictEqual(getConfig(db, "batch_size"), 32);
  });

  it("stores a custom boolean key with explicit type", () => {
    setConfig(db, "verbose", true, "cli", "boolean");
    strictEqual(getConfig(db, "verbose"), true);
  });

  it("infers string type for custom keys when value is a string", () => {
    setConfig(db, "project_name", "ghostpaw", "cli");
    const entry = getCurrentEntry(db, "project_name");
    ok(entry);
    strictEqual(entry.type, "string");
  });

  it("infers integer type for custom keys when value is an integer", () => {
    setConfig(db, "batch_size", 32, "cli");
    const entry = getCurrentEntry(db, "batch_size");
    ok(entry);
    strictEqual(entry.type, "integer");
  });

  it("infers number type for custom keys when value is a float", () => {
    setConfig(db, "threshold", 0.75, "cli");
    const entry = getCurrentEntry(db, "threshold");
    ok(entry);
    strictEqual(entry.type, "number");
  });

  it("infers boolean type for custom keys when value is a boolean", () => {
    setConfig(db, "debug", false, "cli");
    const entry = getCurrentEntry(db, "debug");
    ok(entry);
    strictEqual(entry.type, "boolean");
  });

  it("uses known key category for system keys", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const entry = getCurrentEntry(db, "default_model");
    ok(entry);
    strictEqual(entry.category, "model");
  });

  it("uses 'custom' category for user keys", () => {
    setConfig(db, "my_key", "val", "cli");
    const entry = getCurrentEntry(db, "my_key");
    ok(entry);
    strictEqual(entry.category, "custom");
  });

  it("records the source", () => {
    setConfig(db, "default_model", "gpt-4o", "web");
    const entry = getCurrentEntry(db, "default_model");
    ok(entry);
    strictEqual(entry.source, "web");
  });

  it("records updated_at as a recent timestamp", () => {
    const before = Date.now();
    setConfig(db, "default_model", "gpt-4o", "cli");
    const after = Date.now();
    const entry = getCurrentEntry(db, "default_model");
    ok(entry);
    ok(entry.updatedAt >= before && entry.updatedAt <= after);
  });

  it("creates a linked list on update (old entry gets next_id)", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    const firstEntry = getCurrentEntry(db, "default_model");
    ok(firstEntry);

    setConfig(db, "default_model", "claude-sonnet-4-6", "web");
    const secondEntry = getCurrentEntry(db, "default_model");
    ok(secondEntry);
    strictEqual(secondEntry.value, "claude-sonnet-4-6");
    strictEqual(secondEntry.nextId, null);

    const oldRow = db.prepare("SELECT next_id FROM config WHERE id = ?").get(firstEntry.id);
    ok(oldRow);
    strictEqual(oldRow.next_id, secondEntry.id);
  });

  it("maintains a three-entry chain", () => {
    setConfig(db, "k", "v1", "cli");
    setConfig(db, "k", "v2", "web");
    setConfig(db, "k", "v3", "agent");

    strictEqual(getConfig(db, "k"), "v3");

    const rows = db.prepare("SELECT * FROM config WHERE key = ? ORDER BY id").all("k");
    strictEqual(rows.length, 3);

    strictEqual(rows[0]!.next_id, rows[1]!.id);
    strictEqual(rows[1]!.next_id, rows[2]!.id);
    strictEqual(rows[2]!.next_id, null);
  });

  it("rejects value that fails type validation for known key", () => {
    throws(() => setConfig(db, "max_tokens_per_session", 0, "cli"), /constraint/i);
    strictEqual(getConfig(db, "max_tokens_per_session"), 200_000);
  });

  it("rejects negative max_cost_per_day", () => {
    throws(() => setConfig(db, "max_cost_per_day", -1, "cli"), /constraint/i);
  });

  it("rejects warn_at_percentage over 100", () => {
    throws(() => setConfig(db, "warn_at_percentage", 101, "cli"), /constraint/i);
  });

  it("rejects wrong runtime type for known key", () => {
    throws(
      () => setConfig(db, "max_tokens_per_session", "not a number" as unknown as number, "cli"),
      /must be an integer/i,
    );
  });

  it("rejects wrong runtime type for custom key with explicit type", () => {
    throws(
      () => setConfig(db, "my_int", "banana" as unknown as number, "cli", "integer"),
      /must be an integer/i,
    );
  });

  it("does not create any rows on validation failure (atomicity)", () => {
    try {
      setConfig(db, "max_tokens_per_session", 0, "cli");
    } catch {
      // expected
    }
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("max_tokens_per_session");
    strictEqual(rows.length, 0);
  });

  it("does not corrupt the chain on failure during update", () => {
    setConfig(db, "max_tokens_per_session", 100, "cli");

    try {
      setConfig(db, "max_tokens_per_session", -1, "cli");
    } catch {
      // expected
    }

    strictEqual(getConfig(db, "max_tokens_per_session"), 100);
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("max_tokens_per_session");
    strictEqual(rows.length, 1);
    strictEqual(rows[0]!.next_id, null);
  });

  it("handles different keys independently", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    setConfig(db, "max_cost_per_day", 10, "web");

    strictEqual(getConfig(db, "default_model"), "gpt-4o");
    strictEqual(getConfig(db, "max_cost_per_day"), 10);

    const modelEntry = getCurrentEntry(db, "default_model");
    const costEntry = getCurrentEntry(db, "max_cost_per_day");
    ok(modelEntry);
    ok(costEntry);
    strictEqual(modelEntry.nextId, null);
    strictEqual(costEntry.nextId, null);
  });
});
