import { rejects } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSoulShardTables, initSoulsTables } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/open_test_database.ts";
import { attunePhaseTwo } from "./attune_phase_two.ts";
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
});

afterEach(() => {
  db.close();
});

describe("attunePhaseTwo", () => {
  it("throws when target soul does not exist", async () => {
    await rejects(
      () =>
        attunePhaseTwo(makeFakeEntity(), db, {
          soulId: 999,
          shardCount: 3,
          sourceDiversity: 2,
          ageSpread: 86400,
        }),
      { message: "Soul 999 not found" },
    );
  });
});
