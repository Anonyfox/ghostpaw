import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { enforceShardCap } from "./enforce_shard_cap.ts";
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

describe("enforceShardCap", () => {
  it("fades oldest shards beyond cap", () => {
    for (let i = 0; i < 5; i++) {
      dropSoulshard(db, "session", null, `obs ${i}`, [1]);
    }
    enforceShardCap(db, 3);
    strictEqual(pendingShardCount(db), 3);
  });

  it("does nothing when under cap", () => {
    dropSoulshard(db, "session", null, "obs", [1]);
    enforceShardCap(db, 75);
    strictEqual(pendingShardCount(db), 1);
  });
});
