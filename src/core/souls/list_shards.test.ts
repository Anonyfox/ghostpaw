import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { listShards } from "./list_shards.ts";
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

describe("listShards", () => {
  it("returns non-faded shards by default", () => {
    dropSoulshard(db, "session", "s-1", "obs 1", [1]);
    dropSoulshard(db, "haunt", "h-1", "obs 2", [1]);
    strictEqual(listShards(db).length, 2);
  });

  it("filters by soul", () => {
    dropSoulshard(db, "session", null, "obs 1", [1]);
    dropSoulshard(db, "session", null, "obs 2", [2]);
    const shards = listShards(db, { soulId: 2 });
    strictEqual(shards.length, 1);
    deepStrictEqual(shards[0].soulIds, [2]);
  });

  it("filters by status", () => {
    dropSoulshard(db, "session", null, "obs", [1]);
    db.prepare("UPDATE soul_shards SET status = 'faded' WHERE id = 1").run();
    strictEqual(listShards(db, { status: "faded" }).length, 1);
    strictEqual(listShards(db).length, 0);
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) dropSoulshard(db, "session", null, `obs ${i}`, [1]);
    strictEqual(listShards(db, { limit: 2 }).length, 2);
  });
});
