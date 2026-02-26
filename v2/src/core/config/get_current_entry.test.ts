import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { getCurrentEntry } from "./get_current_entry.ts";
import { initConfigTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function insertRow(key: string, value: string, nextId: number | null = null) {
  const result = db
    .prepare(
      "INSERT INTO config (key, value, type, category, source, next_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(key, value, "string", "custom", "cli", nextId, Date.now());
  return result.lastInsertRowid;
}

describe("getCurrentEntry", () => {
  it("returns null when no entries exist for the key", () => {
    strictEqual(getCurrentEntry(db, "nonexistent"), null);
  });

  it("returns the single entry when only one exists (next_id IS NULL)", () => {
    insertRow("my_key", "my_value");
    const entry = getCurrentEntry(db, "my_key");
    ok(entry);
    strictEqual(entry.key, "my_key");
    strictEqual(entry.value, "my_value");
    strictEqual(entry.nextId, null);
  });

  it("returns the current entry in a chain (the one with next_id IS NULL)", () => {
    const id1 = insertRow("my_key", "v1");
    const id2 = insertRow("my_key", "v2");
    db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(id2, id1);

    const entry = getCurrentEntry(db, "my_key");
    ok(entry);
    strictEqual(entry.value, "v2");
    strictEqual(entry.nextId, null);
  });

  it("returns the correct entry in a three-entry chain", () => {
    const id1 = insertRow("k", "v1");
    const id2 = insertRow("k", "v2");
    const id3 = insertRow("k", "v3");
    db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(id2, id1);
    db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(id3, id2);

    const entry = getCurrentEntry(db, "k");
    ok(entry);
    strictEqual(entry.value, "v3");
    strictEqual(entry.id, id3);
  });

  it("does not return entries for a different key", () => {
    insertRow("key_a", "val_a");
    insertRow("key_b", "val_b");

    const entry = getCurrentEntry(db, "key_a");
    ok(entry);
    strictEqual(entry.value, "val_a");
  });

  it("maps all fields correctly to the ConfigEntry interface", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("test", "val", "integer", "cost", "web", now);

    const entry = getCurrentEntry(db, "test");
    ok(entry);
    strictEqual(typeof entry.id, "number");
    strictEqual(entry.key, "test");
    strictEqual(entry.value, "val");
    strictEqual(entry.type, "integer");
    strictEqual(entry.category, "cost");
    strictEqual(entry.source, "web");
    strictEqual(entry.nextId, null);
    strictEqual(entry.updatedAt, now);
  });
});
