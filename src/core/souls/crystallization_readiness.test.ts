import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { crystallizationReadiness } from "./crystallization_readiness.ts";
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

function insertShard(source: string, sourceId: string, observation: string, createdAt: number) {
  db.prepare(
    "INSERT INTO soul_shards (source, source_id, observation, sealed, status, created_at) VALUES (?, ?, ?, 0, 'pending', ?)",
  ).run(source, sourceId, observation, createdAt);
  const id = (db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
  db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)").run(id, 1);
}

describe("crystallizationReadiness", () => {
  it("returns souls meeting threshold: 3+ shards, 2+ sources, age spread", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 2 * 86400;
    insertShard("session", "s-1", "obs 1", oldTime);
    insertShard("haunt", "h-1", "obs 2", oldTime + 86400);
    insertShard("session", "s-2", "obs 3", oldTime + 2 * 86400);

    const ready = crystallizationReadiness(db);
    strictEqual(ready.length, 1);
    strictEqual(ready[0].soulId, 1);
    strictEqual(ready[0].shardCount, 3);
    strictEqual(ready[0].sourceDiversity, 2);
  });

  it("excludes souls with only one source type", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 2 * 86400;
    for (let i = 0; i < 3; i++) {
      insertShard("session", `s-${i}`, `obs ${i}`, oldTime + i * 86400);
    }
    strictEqual(crystallizationReadiness(db).length, 0);
  });

  it("excludes souls with insufficient age spread", () => {
    const now = Math.floor(Date.now() / 1000);
    insertShard("session", "s-1", "obs 1", now);
    insertShard("haunt", "h-1", "obs 2", now + 100);
    insertShard("session", "s-2", "obs 3", now + 200);
    strictEqual(crystallizationReadiness(db).length, 0);
  });

  it("respects custom minShards threshold", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 2 * 86400;
    insertShard("session", "s-1", "obs 1", oldTime);
    insertShard("haunt", "h-1", "obs 2", oldTime + 2 * 86400);
    strictEqual(crystallizationReadiness(db, 2).length, 1);
    strictEqual(crystallizationReadiness(db, 3).length, 0);
  });

  it("excludes souls with no new shards since last_attuned_at", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 2 * 86400;
    insertShard("session", "s-1", "obs 1", oldTime);
    insertShard("haunt", "h-1", "obs 2", oldTime + 86400);
    insertShard("session", "s-2", "obs 3", oldTime + 2 * 86400);

    strictEqual(crystallizationReadiness(db).length, 1);

    db.prepare("UPDATE souls SET last_attuned_at = ? WHERE id = 1").run(oldTime + 3 * 86400);
    strictEqual(crystallizationReadiness(db).length, 0);
  });

  it("re-qualifies after new shard arrives post-attunement", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 3 * 86400;
    insertShard("session", "s-1", "obs 1", oldTime);
    insertShard("haunt", "h-1", "obs 2", oldTime + 86400);
    insertShard("session", "s-2", "obs 3", oldTime + 2 * 86400);

    const attuneTime = oldTime + 2 * 86400 + 100;
    db.prepare("UPDATE souls SET last_attuned_at = ? WHERE id = 1").run(attuneTime);
    strictEqual(crystallizationReadiness(db).length, 0);

    insertShard("delegation", "d-1", "obs 4", attuneTime + 3600);
    strictEqual(crystallizationReadiness(db).length, 1);
  });
});
