import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { openTestDatabase } from "./open_test_database.ts";

describe("openTestDatabase", () => {
  it("opens an in-memory database", async () => {
    const db = await openTestDatabase();
    ok(db.exec);
    ok(db.prepare);
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY)");
    db.prepare("INSERT INTO t (id) VALUES (1)").run();
    const row = db.prepare("SELECT id FROM t").get();
    strictEqual(row?.id, 1);
    db.close();
  });

  it("enforces foreign keys", async () => {
    const db = await openTestDatabase();
    db.exec("CREATE TABLE parent (id INTEGER PRIMARY KEY)");
    db.exec("CREATE TABLE child (id INTEGER PRIMARY KEY, pid INTEGER REFERENCES parent(id))");
    let threw = false;
    try {
      db.prepare("INSERT INTO child (pid) VALUES (999)").run();
    } catch {
      threw = true;
    }
    strictEqual(threw, true, "FK constraint should reject invalid reference");
    db.close();
  });
});
