import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable } from "../core/config/index.ts";
import { initSoulShardTables, initSoulsTables } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/open_test_database.ts";
import { runAttune } from "./run_attune.ts";
import type { Entity } from "./types.ts";

let db: DatabaseHandle;

function makeFakeEntity(): Entity {
  return {
    db: null as unknown as DatabaseHandle,
    workspace: "/tmp/test",
    async *streamTurn(): AsyncGenerator<string> {
      yield "";
      throw new Error("no LLM in tests");
    },
    async executeTurn() {
      throw new Error("no LLM in tests");
    },
    async flush() {},
  };
}

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
  initSoulShardTables(db);
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

describe("runAttune", () => {
  it("returns clean result when no shards exist", async () => {
    const result = await runAttune(makeFakeEntity(), db);
    strictEqual(result.totalPendingShards, 0);
    strictEqual(result.crystallizingCount, 0);
    strictEqual(result.phaseTwoRan, false);
  });
});
