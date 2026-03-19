import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { initSoulsTables } from "./schema.ts";
import { initSoulShardTables } from "./shard_schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
});

afterEach(() => {
  db.close();
});

describe("initSoulShardTables", () => {
  it("creates all three tables without error", () => {
    initSoulShardTables(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('soul_shards', 'shard_souls', 'shard_citations') ORDER BY name",
      )
      .all() as { name: string }[];

    ok(tables.some((t) => t.name === "soul_shards"));
    ok(tables.some((t) => t.name === "shard_souls"));
    ok(tables.some((t) => t.name === "shard_citations"));
  });

  it("is idempotent", () => {
    initSoulShardTables(db);
    initSoulShardTables(db);
  });
});
