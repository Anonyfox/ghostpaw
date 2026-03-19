export type TierName = "Uncheckpointed" | "Apprentice" | "Journeyman" | "Expert" | "Master";

export interface SkillTierInfo {
  tier: TierName;
  rank: number;
}

export function skillTier(rank: number): SkillTierInfo {
  if (rank >= 10) return { tier: "Master", rank };
  if (rank >= 6) return { tier: "Expert", rank };
  if (rank >= 3) return { tier: "Journeyman", rank };
  if (rank >= 1) return { tier: "Apprentice", rank };
  return { tier: "Uncheckpointed", rank };
}
