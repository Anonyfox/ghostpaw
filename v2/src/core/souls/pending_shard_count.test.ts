import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
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

describe("pendingShardCount", () => {
  it("counts only unsealed pending shards", () => {
    strictEqual(pendingShardCount(db), 0);
    dropSoulshard(db, "session", null, "obs 1", [1]);
    dropSoulshard(db, "quest", "q-1", "sealed", [1], true);
    strictEqual(pendingShardCount(db), 1);
  });
});
