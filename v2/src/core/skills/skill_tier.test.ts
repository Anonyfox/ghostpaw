import { deepStrictEqual } from "node:assert";
import { describe, it } from "node:test";
import { skillTier } from "./skill_tier.ts";

describe("skillTier", () => {
  it("returns correct tier for each rank threshold", () => {
    deepStrictEqual(skillTier(0), { tier: "Uncheckpointed", rank: 0 });
    deepStrictEqual(skillTier(1), { tier: "Apprentice", rank: 1 });
    deepStrictEqual(skillTier(2), { tier: "Apprentice", rank: 2 });
    deepStrictEqual(skillTier(3), { tier: "Journeyman", rank: 3 });
    deepStrictEqual(skillTier(5), { tier: "Journeyman", rank: 5 });
    deepStrictEqual(skillTier(6), { tier: "Expert", rank: 6 });
    deepStrictEqual(skillTier(9), { tier: "Expert", rank: 9 });
    deepStrictEqual(skillTier(10), { tier: "Master", rank: 10 });
    deepStrictEqual(skillTier(25), { tier: "Master", rank: 25 });
  });

  it("handles negative ranks as Uncheckpointed", () => {
    deepStrictEqual(skillTier(-1), { tier: "Uncheckpointed", rank: -1 });
  });
});
