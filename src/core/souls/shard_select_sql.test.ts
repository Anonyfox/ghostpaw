import { ok } from "node:assert";
import { describe, it } from "node:test";
import { SHARD_SELECT_WITH_SOULS } from "./shard_select_sql.ts";

describe("SHARD_SELECT_WITH_SOULS", () => {
  it("contains GROUP_CONCAT join for soul_ids aggregation", () => {
    ok(SHARD_SELECT_WITH_SOULS.includes("GROUP_CONCAT"));
    ok(SHARD_SELECT_WITH_SOULS.includes("soul_shards"));
    ok(SHARD_SELECT_WITH_SOULS.includes("shard_souls"));
  });
});
