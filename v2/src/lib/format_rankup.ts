import { skillTier } from "../core/skills/skill_tier.ts";

export function formatRankUp(skillName: string, newRank: number): string {
  const { tier } = skillTier(newRank);
  return `${skillName} reached ${tier} (rank ${newRank})`;
}
