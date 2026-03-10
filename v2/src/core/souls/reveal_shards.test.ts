import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { dropSoulshard } from "./drop_soulshard.ts";
import { revealShards } from "./reveal_shards.ts";
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

describe("revealShards", () => {
  it("flips sealed flag for matching source batch", () => {
    dropSoulshard(db, "quest", "q-1", "obs 1", [1], true);
    dropSoulshard(db, "quest", "q-1", "obs 2", [1], true);
    dropSoulshard(db, "quest", "q-2", "obs 3", [1], true);

    revealShards(db, "quest", "q-1");

    const revealed = db
      .prepare("SELECT COUNT(*) AS cnt FROM soul_shards WHERE sealed = 0")
      .get() as { cnt: number };
    strictEqual(revealed.cnt, 2);
  });

  it("does nothing when no sealed shards match", () => {
    dropSoulshard(db, "session", "s-1", "obs", [1]);
    revealShards(db, "quest", "q-99");

    const count = db.prepare("SELECT COUNT(*) AS cnt FROM soul_shards WHERE sealed = 0").get() as {
      cnt: number;
    };
    strictEqual(count.cnt, 1);
  });
});
