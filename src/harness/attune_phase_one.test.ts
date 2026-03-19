import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable } from "../core/config/runtime/index.ts";
import { pendingShardCount } from "../core/souls/api/read/index.ts";
import { dropSoulshard } from "../core/souls/api/write/index.ts";
import { initSoulShardTables, initSoulsTables } from "../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/open_test_database.ts";
import { attunePhaseOne } from "./attune_phase_one.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
  initSoulShardTables(db);
  initConfigTable(db);
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

describe("attunePhaseOne", () => {
  it("returns shard count and empty readiness with no shards", () => {
    const { totalPendingShards, readySouls } = attunePhaseOne(db);
    strictEqual(totalPendingShards, 0);
    strictEqual(readySouls.length, 0);
  });

  it("enforces shard cap during maintenance", () => {
    for (let i = 0; i < 80; i++) {
      dropSoulshard(db, "session", null, `obs ${i}`, [1]);
    }
    attunePhaseOne(db);
    ok(pendingShardCount(db) <= 75);
  });

  it("detects crystallization readiness", () => {
    const oldTime = Math.floor(Date.now() / 1000) - 2 * 86400;

    db.prepare(
      "INSERT INTO soul_shards (source, source_id, observation, sealed, status, created_at) VALUES (?, ?, ?, 0, 'pending', ?)",
    ).run("session", "s-1", "obs 1", oldTime);
    db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)").run(1, 1);

    db.prepare(
      "INSERT INTO soul_shards (source, source_id, observation, sealed, status, created_at) VALUES (?, ?, ?, 0, 'pending', ?)",
    ).run("haunt", "h-1", "obs 2", oldTime + 86400);
    db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)").run(2, 1);

    db.prepare(
      "INSERT INTO soul_shards (source, source_id, observation, sealed, status, created_at) VALUES (?, ?, ?, 0, 'pending', ?)",
    ).run("session", "s-2", "obs 3", oldTime + 2 * 86400);
    db.prepare("INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)").run(3, 1);

    const { readySouls } = attunePhaseOne(db);
    strictEqual(readySouls.length, 1);
    strictEqual(readySouls[0].soulId, 1);
  });

  it("excludes faded shards from count", () => {
    for (let i = 0; i < 3; i++) {
      dropSoulshard(db, "session", null, `obs ${i}`, [1]);
    }
    db.prepare("UPDATE soul_shards SET status = 'faded' WHERE id = 1").run();
    const { totalPendingShards } = attunePhaseOne(db);
    strictEqual(totalPendingShards, 2);
  });
});
