import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { getConfig } from "./get_config.ts";
import { getCurrentEntry } from "./get_current_entry.ts";
import { initConfigTable } from "./schema.ts";
import { setConfig } from "./set_config.ts";
import { undoConfig } from "./undo_config.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("undoConfig", () => {
  it("returns false when no entries exist for the key", () => {
    strictEqual(undoConfig(db, "nonexistent"), false);
  });

  it("removes the only entry and returns true (no predecessor)", () => {
    setConfig(db, "my_key", "val", "cli");
    strictEqual(undoConfig(db, "my_key"), true);
    strictEqual(getConfig(db, "my_key"), null);
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("my_key");
    strictEqual(rows.length, 0);
  });

  it("restores the previous entry in a two-entry chain", () => {
    setConfig(db, "my_key", "v1", "cli");
    setConfig(db, "my_key", "v2", "web");
    strictEqual(getConfig(db, "my_key"), "v2");

    strictEqual(undoConfig(db, "my_key"), true);
    strictEqual(getConfig(db, "my_key"), "v1");

    const entry = getCurrentEntry(db, "my_key");
    ok(entry);
    strictEqual(entry.value, "v1");
    strictEqual(entry.nextId, null);
  });

  it("restores the previous entry in a three-entry chain", () => {
    setConfig(db, "k", "v1", "cli");
    setConfig(db, "k", "v2", "web");
    setConfig(db, "k", "v3", "agent");
    strictEqual(getConfig(db, "k"), "v3");

    strictEqual(undoConfig(db, "k"), true);
    strictEqual(getConfig(db, "k"), "v2");

    const rows = db.prepare("SELECT * FROM config WHERE key = ? ORDER BY id").all("k");
    strictEqual(rows.length, 2);
    strictEqual(rows[0]!.next_id, rows[1]!.id);
    strictEqual(rows[1]!.next_id, null);
  });

  it("can be called repeatedly to walk back the chain", () => {
    setConfig(db, "k", "v1", "cli");
    setConfig(db, "k", "v2", "web");
    setConfig(db, "k", "v3", "agent");

    strictEqual(undoConfig(db, "k"), true);
    strictEqual(getConfig(db, "k"), "v2");

    strictEqual(undoConfig(db, "k"), true);
    strictEqual(getConfig(db, "k"), "v1");

    strictEqual(undoConfig(db, "k"), true);
    strictEqual(getConfig(db, "k"), null);

    strictEqual(undoConfig(db, "k"), false);
  });

  it("known key falls back to code default after full undo", () => {
    setConfig(db, "default_model", "gpt-4o", "cli");
    undoConfig(db, "default_model");
    strictEqual(getConfig(db, "default_model"), "claude-sonnet-4-6");
  });

  it("does not affect other keys", () => {
    setConfig(db, "key_a", "a1", "cli");
    setConfig(db, "key_a", "a2", "web");
    setConfig(db, "key_b", "b1", "cli");

    undoConfig(db, "key_a");
    strictEqual(getConfig(db, "key_a"), "a1");
    strictEqual(getConfig(db, "key_b"), "b1");
  });

  it("preserves chain integrity after undo (predecessor becomes current)", () => {
    setConfig(db, "k", "v1", "cli");
    setConfig(db, "k", "v2", "web");
    undoConfig(db, "k");

    const entry = getCurrentEntry(db, "k");
    ok(entry);
    strictEqual(entry.nextId, null);

    setConfig(db, "k", "v3", "agent");
    strictEqual(getConfig(db, "k"), "v3");

    const rows = db.prepare("SELECT * FROM config WHERE key = ? ORDER BY id").all("k");
    strictEqual(rows.length, 2);
    strictEqual(rows[0]!.next_id, rows[1]!.id);
    strictEqual(rows[1]!.next_id, null);
  });
});
