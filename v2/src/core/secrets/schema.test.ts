import { ok, strictEqual, throws } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { initSecretsTable } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

afterEach(() => {
  db.close();
});

describe("initSecretsTable", () => {
  it("creates the secrets table with expected columns", () => {
    initSecretsTable(db);
    const cols = db.prepare("PRAGMA table_info(secrets)").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    ok(names.includes("key"), "should have key column");
    ok(names.includes("value"), "should have value column");
    ok(names.includes("updated_at"), "should have updated_at column");
    strictEqual(names.length, 3);
  });

  it("is idempotent (calling twice does not throw)", () => {
    initSecretsTable(db);
    initSecretsTable(db);
    const cols = db.prepare("PRAGMA table_info(secrets)").all();
    strictEqual(cols.length, 3);
  });

  it("allows inserting a valid row", () => {
    initSecretsTable(db);
    db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run(
      "MY_KEY",
      "my_value",
      Date.now(),
    );
    const row = db.prepare("SELECT * FROM secrets WHERE key = ?").get("MY_KEY");
    ok(row);
    strictEqual(row.key, "MY_KEY");
    strictEqual(row.value, "my_value");
  });

  it("enforces PRIMARY KEY uniqueness on key column", () => {
    initSecretsTable(db);
    const now = Date.now();
    db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run("K", "v1", now);
    throws(
      () =>
        db
          .prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)")
          .run("K", "v2", now),
      /UNIQUE/i,
    );
  });

  it("rejects rows with null value", () => {
    initSecretsTable(db);
    throws(
      () =>
        db
          .prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)")
          .run("K", null, Date.now()),
      /NOT NULL/i,
    );
  });

  it("rejects rows with null updated_at", () => {
    initSecretsTable(db);
    throws(
      () =>
        db
          .prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)")
          .run("K", "v", null),
      /NOT NULL/i,
    );
  });
});
