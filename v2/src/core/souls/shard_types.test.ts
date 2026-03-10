import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { CrystallizationEntry, ShardSource, ShardStatus, SoulShard } from "./shard_types.ts";

describe("shard types", () => {
  it("ShardSource accepts valid source strings", () => {
    const sources: ShardSource[] = ["session", "haunt", "delegation", "quest"];
    strictEqual(sources.length, 4);
  });

  it("ShardStatus accepts valid status strings", () => {
    const statuses: ShardStatus[] = ["pending", "faded"];
    strictEqual(statuses.length, 2);
  });

  it("SoulShard structure is assignable", () => {
    const shard: SoulShard = {
      id: 1,
      source: "session",
      sourceId: null,
      observation: "obs",
      sealed: false,
      status: "pending",
      createdAt: Date.now(),
      soulIds: [1, 2],
    };
    ok(shard.soulIds.length > 0);
  });

  it("CrystallizationEntry captures readiness metrics", () => {
    const entry: CrystallizationEntry = {
      soulId: 1,
      shardCount: 5,
      sourceDiversity: 3,
      ageSpread: 86400,
    };
    ok(entry.shardCount >= entry.sourceDiversity);
  });
});
