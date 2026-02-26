import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database.ts";
import { openTestDatabase } from "../../lib/database.ts";
import { initSecretsTable } from "./schema.ts";
import { upsertSecret } from "./upsert_secret.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSecretsTable(db);
});

afterEach(() => {
  db.close();
});

describe("upsertSecret", () => {
  it("inserts a new row", () => {
    upsertSecret(db, "MY_KEY", "val");
    const row = db.prepare("SELECT key, value FROM secrets WHERE key = ?").get("MY_KEY");
    ok(row);
    strictEqual(row.value, "val");
  });

  it("updates an existing row on conflict", () => {
    upsertSecret(db, "MY_KEY", "v1");
    upsertSecret(db, "MY_KEY", "v2");
    const row = db.prepare("SELECT value FROM secrets WHERE key = ?").get("MY_KEY");
    ok(row);
    strictEqual(row.value, "v2");
  });

  it("sets updated_at to a recent timestamp", () => {
    const before = Date.now();
    upsertSecret(db, "MY_KEY", "val");
    const after = Date.now();
    const row = db.prepare("SELECT updated_at FROM secrets WHERE key = ?").get("MY_KEY");
    ok(row);
    const ts = row.updated_at as number;
    ok(ts >= before && ts <= after);
  });
});
