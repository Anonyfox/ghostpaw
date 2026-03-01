interface SoulXpBarProps {
  activeTraits: number;
  traitLimit: number;
  variant?: "compact" | "full";
  isHero?: boolean;
  isArchived?: boolean;
}

export function SoulXpBar({
  activeTraits,
  traitLimit,
  variant = "compact",
  isHero = false,
  isArchived = false,
}: SoulXpBarProps) {
  if (traitLimit <= 0) return null;

  const clamped = Math.max(0, activeTraits);
  const percent = Math.min(100, Math.round((clamped / traitLimit) * 100));
  const isReady = clamped >= traitLimit;
  const isOverflow = clamped > traitLimit;

  let barClass = "progress-bar";
  if (isArchived) {
    barClass += " bg-secondary";
  } else if (isOverflow) {
    barClass += " bg-danger progress-bar-striped progress-bar-animated";
  } else if (isReady) {
    barClass += " bg-warning progress-bar-striped progress-bar-animated";
  } else if (isHero) {
    barClass += " bg-info bg-opacity-75";
  } else {
    barClass += " bg-info";
  }

  const height = variant === "full" ? "12px" : "6px";
  const label = isOverflow
    ? `${clamped}/${traitLimit} Overflow`
    : isReady
      ? `${clamped}/${traitLimit} Ready!`
      : `${clamped}/${traitLimit}`;

  const labelClass = variant === "full" ? "small fw-semibold" : "small";
  const textColor = isArchived
    ? "text-muted"
    : isReady
      ? "text-warning"
      : isHero
        ? "text-info"
        : "text-muted";

  return (
    <div>
      <div class="progress" style={`height: ${height};`}>
        <div class={barClass} style={`width: ${percent}%;`} />
      </div>
      <div class={`${labelClass} ${textColor} mt-1`}>{label}</div>
    </div>
  );
}
