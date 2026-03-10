import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { LevelSnapshot, SoulEvidence } from "./soul_evidence_types.ts";

describe("SoulEvidence types", () => {
  it("LevelSnapshot is assignable from a well-formed object", () => {
    const snap: LevelSnapshot = {
      level: 1,
      createdAt: Date.now(),
      traitsConsolidatedCount: 2,
      traitsPromotedCount: 1,
      traitsCarriedCount: 3,
      traitsMergedCount: 1,
    };
    ok(snap.level > 0);
  });

  it("SoulEvidence has all required fields", () => {
    const keys: (keyof SoulEvidence)[] = [
      "soulId",
      "soulName",
      "level",
      "essence",
      "description",
      "activeTraitCount",
      "traitLimit",
      "atCapacity",
      "delegationStats",
      "windowedStats",
      "traitFitness",
      "costTrend",
      "activeTraits",
      "revertedTraits",
      "consolidatedTraits",
      "promotedTraits",
      "levelHistory",
      "relatedMemoryCount",
      "pendingShards",
    ];
    ok(keys.length === 19);
  });
});
