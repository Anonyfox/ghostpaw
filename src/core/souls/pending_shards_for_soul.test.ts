import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { pendingShardsForSoul } from "./pending_shards_for_soul.ts";
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

describe("pendingShardsForSoul", () => {
  it("returns only pending unsealed shards for a specific soul", () => {
    dropSoulshard(db, "session", "s-1", "obs for both", [1, 2]);
    dropSoulshard(db, "session", "s-2", "obs for engineer only", [2]);
    dropSoulshard(db, "quest", "q-1", "sealed obs", [1], true);

    const ghostpawShards = pendingShardsForSoul(db, 1);
    strictEqual(ghostpawShards.length, 1);
    strictEqual(ghostpawShards[0].observation, "obs for both");

    const engineerShards = pendingShardsForSoul(db, 2);
    strictEqual(engineerShards.length, 2);
  });

  it("includes soulIds via GROUP_CONCAT without N+1", () => {
    dropSoulshard(db, "session", "s-1", "shared obs", [1, 2]);
    const shards = pendingShardsForSoul(db, 1);
    strictEqual(shards[0].soulIds.length, 2);
    strictEqual(shards[0].soulIds.includes(1), true);
    strictEqual(shards[0].soulIds.includes(2), true);
  });
});
