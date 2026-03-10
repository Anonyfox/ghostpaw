import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { initSoulsTables } from "./schema.ts";
import { initSoulShardTables } from "./shard_schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
  initSoulShardTables(db);
  const now = Date.now();
  db.prepare(
    "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
  ).run(1, "Ghostpaw", now, now);
  db.prepare(
    "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
  ).run(2, "JS Engineer", now, now);
});

afterEach(() => {
  db.close();
});

describe("dropSoulshard", () => {
  it("creates a shard with junction rows for each soul", () => {
    const id = dropSoulshard(db, "session", "s-1", "Engineer re-reads files often", [1, 2]);
    strictEqual(id, 1);

    const shard = db.prepare("SELECT * FROM soul_shards WHERE id = 1").get() as Record<
      string,
      unknown
    >;
    strictEqual(shard.source, "session");
    strictEqual(shard.source_id, "s-1");
    strictEqual(shard.sealed, 0);
    strictEqual(shard.status, "pending");

    const junctions = db.prepare("SELECT * FROM shard_souls WHERE shard_id = 1").all();
    strictEqual(junctions.length, 2);
  });

  it("creates sealed shards", () => {
    dropSoulshard(db, "quest", "q-1", "obs", [2], true);
    const shard = db.prepare("SELECT sealed FROM soul_shards WHERE id = 1").get() as {
      sealed: number;
    };
    strictEqual(shard.sealed, 1);
  });

  it("returns the inserted id", () => {
    dropSoulshard(db, "session", null, "first", [1]);
    const second = dropSoulshard(db, "session", null, "second", [1]);
    strictEqual(second, 2);
  });
});
