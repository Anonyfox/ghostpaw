import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { expireOldShards } from "./expire_old_shards.ts";
import { pendingShardCount } from "./pending_shard_count.ts";
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
});

afterEach(() => {
  db.close();
});

describe("expireOldShards", () => {
  it("fades shards older than threshold", () => {
    db.prepare(
      "INSERT INTO soul_shards (source, observation, status, created_at) VALUES (?, ?, 'pending', ?)",
    ).run("session", "old obs", Math.floor(Date.now() / 1000) - 121 * 86400);
    db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)").run(1, 1);
    dropSoulshard(db, "session", null, "fresh obs", [1]);

    expireOldShards(db, 120);
    strictEqual(pendingShardCount(db), 1);
  });
});
