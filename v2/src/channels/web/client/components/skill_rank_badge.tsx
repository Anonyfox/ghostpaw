interface SkillRankBadgeProps {
  rank: number;
  tier?: string;
  variant?: "compact" | "full";
}

function rankTier(rank: number): { label: string; colorClass: string } {
  if (rank >= 10) return { label: "Master", colorClass: "text-danger" };
  if (rank >= 6) return { label: "Expert", colorClass: "text-warning" };
  if (rank >= 3) return { label: "Journeyman", colorClass: "text-info" };
  if (rank >= 1) return { label: "Apprentice", colorClass: "text-secondary" };
  return { label: "Uncheckpointed", colorClass: "text-muted" };
}

export function SkillRankBadge({ rank, tier, variant = "compact" }: SkillRankBadgeProps) {
  const derived = rankTier(rank);
  const label = tier ?? derived.label;
  const colorClass = derived.colorClass;

  if (variant === "compact") {
    return <span class={`small fw-semibold ${colorClass}`}>Rank {rank}</span>;
  }

  return (
    <span class={`fw-semibold ${colorClass}`}>
      Rank {rank} — {label}
    </span>
  );
}
