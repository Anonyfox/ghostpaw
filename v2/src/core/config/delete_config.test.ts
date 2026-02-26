import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { deleteConfig } from "./delete_config.ts";
import { getConfig } from "./get_config.ts";
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

describe("deleteConfig", () => {
  it("removes a single-entry key from the database", () => {
    setConfig(db, "my_key", "val", "cli");
    deleteConfig(db, "my_key");
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("my_key");
    strictEqual(rows.length, 0);
  });

  it("removes all entries in a chain for a key", () => {
    setConfig(db, "my_key", "v1", "cli");
    setConfig(db, "my_key", "v2", "web");
    setConfig(db, "my_key", "v3", "agent");
    deleteConfig(db, "my_key");
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("my_key");
    strictEqual(rows.length, 0);
  });

  it("known key falls back to code default after deletion", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    deleteConfig(db, "default_model");
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
  });

  it("custom key returns null after deletion", () => {
    setConfig(db, "my_key", "val", "cli");
    deleteConfig(db, "my_key");
    strictEqual(getConfig(db, "my_key"), null);
  });

  it("is a no-op for a key that does not exist", () => {
    deleteConfig(db, "nonexistent");
    const rows = db.prepare("SELECT * FROM config").all();
    strictEqual(rows.length, 0);
  });

  it("does not affect other keys", () => {
    setConfig(db, "key_a", "a", "cli");
    setConfig(db, "key_b", "b", "cli");
    deleteConfig(db, "key_a");
    strictEqual(getConfig(db, "key_a"), null);
    strictEqual(getConfig(db, "key_b"), "b");
  });

  it("allows re-setting a key after deletion", () => {
    setConfig(db, "my_key", "original", "cli");
    deleteConfig(db, "my_key");
    setConfig(db, "my_key", "new_value", "web");
    strictEqual(getConfig(db, "my_key"), "new_value");
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("my_key");
    strictEqual(rows.length, 1);
    strictEqual(rows[0]!.next_id, null);
  });
});
