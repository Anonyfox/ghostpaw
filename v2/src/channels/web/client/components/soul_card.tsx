import { Link } from "wouter-preact";
import type { SoulOverviewInfo } from "../../shared/soul_types.ts";
import { SoulXpBar } from "./soul_xp_bar.tsx";

interface SoulCardProps {
  soul: SoulOverviewInfo;
  traitLimit: number;
  variant?: "hero" | "party" | "custom" | "dormant";
  onRetire?: (id: number) => void;
  onAwaken?: (id: number) => void;
}

export function SoulCard({
  soul,
  traitLimit,
  variant = "custom",
  onRetire,
  onAwaken,
}: SoulCardProps) {
  const isHero = variant === "hero";
  const isDormant = variant === "dormant";
  const cardClass = [
    "card",
    "h-100",
    isHero ? "border-info border-2" : "",
    isDormant ? "border-secondary opacity-75" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleRetire = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRetire && confirm(`Retire soul "${soul.name}"?`)) {
      onRetire(soul.id);
    }
  };

  const handleAwaken = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onAwaken?.(soul.id);
  };

  return (
    <div class={cardClass}>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h5 class="card-title mb-0">
            <Link
              href={`/souls/${soul.id}`}
              class={isHero ? "text-info text-decoration-none" : "text-info text-decoration-none"}
            >
              {soul.name}
            </Link>
          </h5>
          <span class={`badge ${isHero ? "bg-info" : "bg-secondary"}`}>Lv. {soul.level}</span>
          {!isDormant && soul.activeTraitCount >= traitLimit && traitLimit > 0 && (
            <span class="badge bg-warning text-dark">Ready</span>
          )}
        </div>
        <p class="card-text small text-body-secondary mb-2">
          {soul.description || soul.essencePreview || <em>No description yet.</em>}
        </p>
        <div class="mb-2">
          <SoulXpBar
            activeTraits={soul.activeTraitCount}
            traitLimit={traitLimit}
            variant="compact"
            isHero={isHero}
            isDormant={isDormant}
          />
        </div>
        <div class="d-flex justify-content-between align-items-center">
          {!soul.isMandatory && !isDormant && onRetire && (
            <button type="button" class="btn btn-outline-danger btn-sm" onClick={handleRetire}>
              Retire
            </button>
          )}
          {isDormant && onAwaken && (
            <button type="button" class="btn btn-outline-success btn-sm" onClick={handleAwaken}>
              Awaken
            </button>
          )}
          {soul.isMandatory && <span class="badge bg-warning text-dark">Core</span>}
        </div>
      </div>
    </div>
  );
}
