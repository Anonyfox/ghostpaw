import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToShard } from "./row_to_shard.ts";

describe("rowToShard", () => {
  it("maps a database row with soul_ids to SoulShard", () => {
    const shard = rowToShard({
      id: 1,
      source: "session",
      source_id: "s-1",
      observation: "Engineer re-reads files",
      sealed: 0,
      status: "pending",
      created_at: 1709000000,
      soul_ids: "1,2",
    });

    strictEqual(shard.id, 1);
    strictEqual(shard.source, "session");
    strictEqual(shard.sealed, false);
    deepStrictEqual(shard.soulIds, [1, 2]);
  });

  it("handles null soul_ids", () => {
    const shard = rowToShard({
      id: 2,
      source: "haunt",
      source_id: null,
      observation: "obs",
      sealed: 1,
      status: "faded",
      created_at: 1709000000,
      soul_ids: null,
    });

    strictEqual(shard.sealed, true);
    deepStrictEqual(shard.soulIds, []);
  });
});
