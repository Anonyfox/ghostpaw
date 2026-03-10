import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { initSoulsTables } from "./schema.ts";
import { shardCountsPerSoul } from "./shard_counts_per_soul.ts";
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

describe("shardCountsPerSoul", () => {
  it("returns grouped counts per soul with source diversity", () => {
    dropSoulshard(db, "session", "s-1", "obs 1", [1, 2]);
    dropSoulshard(db, "haunt", "h-1", "obs 2", [1]);
    dropSoulshard(db, "session", "s-2", "obs 3", [2]);

    const counts = shardCountsPerSoul(db);
    const soul1 = counts.find((c) => c.soulId === 1);
    const soul2 = counts.find((c) => c.soulId === 2);

    strictEqual(soul1?.count, 2);
    strictEqual(soul1?.sourceCount, 2);
    strictEqual(soul2?.count, 2);
    strictEqual(soul2?.sourceCount, 1);
  });

  it("returns empty array when no shards exist", () => {
    strictEqual(shardCountsPerSoul(db).length, 0);
  });
});
