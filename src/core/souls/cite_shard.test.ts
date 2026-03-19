import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { citeShard } from "./cite_shard.ts";
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
    "INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at) VALUES (?, ?, ?, 0, 'active', ?, ?)",
  ).run(1, "trait 1", "prov", now, now);
});

afterEach(() => {
  db.close();
});

describe("citeShard", () => {
  it("creates a citation linking shard to trait", () => {
    dropSoulshard(db, "session", "s-1", "obs", [1]);
    citeShard(db, 1, 1);

    const row = db.prepare("SELECT * FROM shard_citations WHERE shard_id = 1").get() as Record<
      string,
      unknown
    >;
    strictEqual(row.trait_id, 1);
  });

  it("ignores duplicate citations", () => {
    dropSoulshard(db, "session", "s-1", "obs", [1]);
    citeShard(db, 1, 1);
    citeShard(db, 1, 1);

    const count = db
      .prepare("SELECT COUNT(*) AS cnt FROM shard_citations WHERE shard_id = 1")
      .get() as { cnt: number };
    strictEqual(count.cnt, 1);
  });
});
