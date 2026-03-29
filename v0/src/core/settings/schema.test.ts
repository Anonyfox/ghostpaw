import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { initSettingsTable } from "./schema.ts";

describe("settings/schema", () => {
  it("creates the settings table", () => {
    const db = openMemoryDatabase();
    initSettingsTable(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .get();
    assert.ok(row);
    db.close();
  });

  it("creates the partial unique index on current heads", () => {
    const db = openMemoryDatabase();
    initSettingsTable(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_settings_head'")
      .get();
    assert.ok(row);
    db.close();
  });

  it("enforces uniqueness on current head per key", () => {
    const db = openMemoryDatabase();
    initSettingsTable(db);
    db.prepare(
      "INSERT INTO settings (key, value, type, secret, source) VALUES (?, ?, ?, ?, ?)",
    ).run("GHOSTPAW_MODEL", "a", "string", 0, "user");
    assert.throws(() => {
      db.prepare(
        "INSERT INTO settings (key, value, type, secret, source) VALUES (?, ?, ?, ?, ?)",
      ).run("GHOSTPAW_MODEL", "b", "string", 0, "user");
    });
    db.close();
  });

  it("allows multiple rows for same key with non-null next_id", () => {
    const db = openMemoryDatabase();
    initSettingsTable(db);
    const r1 = db
      .prepare("INSERT INTO settings (key, value, type, secret, source) VALUES (?, ?, ?, ?, ?)")
      .run("GHOSTPAW_MODEL", "a", "string", 0, "user");
    const id1 = Number(r1.lastInsertRowid);
    db.prepare("UPDATE settings SET next_id = ? WHERE id = ?").run(id1 + 999, id1);
    db.prepare(
      "INSERT INTO settings (key, value, type, secret, source) VALUES (?, ?, ?, ?, ?)",
    ).run("GHOSTPAW_MODEL", "b", "string", 0, "user");
    const count = db
      .prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'GHOSTPAW_MODEL'")
      .get() as {
      c: number;
    };
    assert.strictEqual(count.c, 2);
    db.close();
  });

  it("is idempotent", () => {
    const db = openMemoryDatabase();
    initSettingsTable(db);
    initSettingsTable(db);
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
      .get();
    assert.ok(row);
    db.close();
  });
});
