import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { citeShard } from "./cite_shard.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { fadeExhaustedShards } from "./fade_exhausted_shards.ts";
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

describe("fadeExhaustedShards", () => {
  it("fades shards after reaching citation threshold", () => {
    dropSoulshard(db, "session", "s-1", "obs", [1]);
    const now = Date.now();
    db.prepare(
      "INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at) VALUES (?, ?, ?, 0, 'active', ?, ?)",
    ).run(1, "trait 1", "prov", now, now);
    db.prepare(
      "INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at) VALUES (?, ?, ?, 0, 'active', ?, ?)",
    ).run(1, "trait 2", "prov", now, now);

    citeShard(db, 1, 1);
    fadeExhaustedShards(db);
    strictEqual(pendingShardCount(db), 1);

    citeShard(db, 1, 2);
    fadeExhaustedShards(db);
    strictEqual(pendingShardCount(db), 0);
  });
});
