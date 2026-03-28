import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { wrapDatabaseSync } from "./wrap.ts";

function openInMemory() {
  const req = createRequire(import.meta.url);
  const { DatabaseSync } = req("node:sqlite") as typeof import("node:sqlite");
  return new DatabaseSync(":memory:");
}

describe("wrapDatabaseSync", () => {
  it("returns a DatabaseHandle with exec, prepare, close", () => {
    const raw = openInMemory();
    const handle = wrapDatabaseSync(raw);
    assert.strictEqual(typeof handle.exec, "function");
    assert.strictEqual(typeof handle.prepare, "function");
    assert.strictEqual(typeof handle.close, "function");
    handle.close();
  });

  it("exec runs DDL without error", () => {
    const raw = openInMemory();
    const handle = wrapDatabaseSync(raw);
    handle.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT) STRICT");
    handle.close();
  });

  it("prepare returns a statement with run, get, all", () => {
    const raw = openInMemory();
    const handle = wrapDatabaseSync(raw);
    handle.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT) STRICT");

    const stmt = handle.prepare("INSERT INTO test (val) VALUES (?)");
    const result = stmt.run("hello");
    assert.strictEqual(typeof result.lastInsertRowid, "number");
    assert.strictEqual(typeof result.changes, "number");
    assert.strictEqual(result.changes, 1);

    const row = handle
      .prepare("SELECT * FROM test WHERE id = ?")
      .get(Number(result.lastInsertRowid));
    assert.ok(row);
    assert.strictEqual(row.val, "hello");

    const rows = handle.prepare("SELECT * FROM test").all();
    assert.strictEqual(rows.length, 1);

    handle.close();
  });
});
