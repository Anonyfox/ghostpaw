import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { initConfigTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

afterEach(() => {
  db.close();
});

describe("initConfigTable", () => {
  it("creates the config table with expected columns", () => {
    initConfigTable(db);
    const cols = db.prepare("PRAGMA table_info(config)").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    ok(names.includes("id"), "should have id column");
    ok(names.includes("key"), "should have key column");
    ok(names.includes("value"), "should have value column");
    ok(names.includes("type"), "should have type column");
    ok(names.includes("category"), "should have category column");
    ok(names.includes("source"), "should have source column");
    ok(names.includes("next_id"), "should have next_id column");
    ok(names.includes("updated_at"), "should have updated_at column");
    strictEqual(names.length, 8);
  });

  it("is idempotent (calling twice does not throw)", () => {
    initConfigTable(db);
    initConfigTable(db);
    const cols = db.prepare("PRAGMA table_info(config)").all();
    strictEqual(cols.length, 8);
  });

  it("id is an autoincrement integer primary key", () => {
    initConfigTable(db);
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("k1", "v1", "string", "custom", "cli", Date.now());
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("k2", "v2", "string", "custom", "cli", Date.now());
    const rows = db.prepare("SELECT id FROM config ORDER BY id").all();
    strictEqual(rows.length, 2);
    ok((rows[0]!.id as number) < (rows[1]!.id as number));
  });

  it("allows inserting a valid row", () => {
    initConfigTable(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("test_key", "test_value", "string", "custom", "cli", now);
    const row = db
      .prepare("SELECT * FROM config WHERE key = ? AND next_id IS NULL")
      .get("test_key");
    ok(row);
    strictEqual(row.key, "test_key");
    strictEqual(row.value, "test_value");
    strictEqual(row.type, "string");
    strictEqual(row.category, "custom");
    strictEqual(row.source, "cli");
    strictEqual(row.next_id, null);
  });

  it("rejects rows with null key", () => {
    initConfigTable(db);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run(null, "v", "string", "custom", "cli", Date.now()),
      /NOT NULL/i,
    );
  });

  it("rejects rows with null value", () => {
    initConfigTable(db);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run("k", null, "string", "custom", "cli", Date.now()),
      /NOT NULL/i,
    );
  });

  it("rejects rows with null updated_at", () => {
    initConfigTable(db);
    throws(
      () =>
        db
          .prepare(
            "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run("k", "v", "string", "custom", "cli", null),
      /NOT NULL/i,
    );
  });

  it("allows multiple rows with the same key (history)", () => {
    initConfigTable(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("same_key", "v1", "string", "custom", "cli", now);
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("same_key", "v2", "string", "custom", "cli", now + 1);
    const rows = db.prepare("SELECT * FROM config WHERE key = ?").all("same_key");
    strictEqual(rows.length, 2);
  });

  it("next_id defaults to null", () => {
    initConfigTable(db);
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("k", "v", "string", "custom", "cli", Date.now());
    const row = db.prepare("SELECT next_id FROM config WHERE key = ?").get("k");
    ok(row);
    strictEqual(row.next_id, null);
  });

  it("next_id foreign key references another config row", () => {
    initConfigTable(db);
    const now = Date.now();
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("k", "v1", "string", "custom", "cli", now);
    const first = db.prepare("SELECT id FROM config WHERE key = ?").get("k") as { id: number };
    db.prepare(
      "INSERT INTO config (key, value, type, category, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("k", "v2", "string", "custom", "cli", now + 1);
    const second = db.prepare("SELECT id FROM config ORDER BY id DESC LIMIT 1").get() as {
      id: number;
    };
    db.prepare("UPDATE config SET next_id = ? WHERE id = ?").run(second.id, first.id);
    const row = db.prepare("SELECT next_id FROM config WHERE id = ?").get(first.id);
    strictEqual(row!.next_id, second.id);
  });

  it("creates the composite index on key and next_id", () => {
    initConfigTable(db);
    const indexes = db.prepare("PRAGMA index_list(config)").all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    ok(
      names.some((n) => n.includes("config_key_next")),
      "composite index should exist",
    );
  });

  it("type column defaults to 'string'", () => {
    initConfigTable(db);
    db.prepare(
      "INSERT INTO config (key, value, category, source, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("k", "v", "custom", "cli", Date.now());
    const row = db.prepare("SELECT type FROM config WHERE key = ?").get("k");
    strictEqual(row!.type, "string");
  });

  it("category column defaults to 'custom'", () => {
    initConfigTable(db);
    db.prepare(
      "INSERT INTO config (key, value, type, source, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("k", "v", "string", "cli", Date.now());
    const row = db.prepare("SELECT category FROM config WHERE key = ?").get("k");
    strictEqual(row!.category, "custom");
  });

  it("source column defaults to 'cli'", () => {
    initConfigTable(db);
    db.prepare(
      "INSERT INTO config (key, value, type, category, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run("k", "v", "string", "custom", Date.now());
    const row = db.prepare("SELECT source FROM config WHERE key = ?").get("k");
    strictEqual(row!.source, "cli");
  });
});
