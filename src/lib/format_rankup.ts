import { skillTier } from "../core/skills/api/read/index.ts";

export function formatRankUp(skillName: string, newRank: number): string {
  const { tier } = skillTier(newRank);
  return `${skillName} reached ${tier} (rank ${newRank})`;
}
