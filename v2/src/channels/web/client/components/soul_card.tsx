import { Link } from "wouter-preact";
import type { SoulOverviewInfo } from "../../shared/soul_types.ts";
import { SoulXpBar } from "./soul_xp_bar.tsx";

interface SoulCardProps {
  soul: SoulOverviewInfo;
  traitLimit: number;
  variant?: "hero" | "party" | "custom" | "graveyard";
  onArchive?: (id: number) => void;
  onRestore?: (id: number) => void;
}

export function SoulCard({
  soul,
  traitLimit,
  variant = "custom",
  onArchive,
  onRestore,
}: SoulCardProps) {
  const isHero = variant === "hero";
  const isGraveyard = variant === "graveyard";
  const cardClass = [
    "card",
    "h-100",
    isHero ? "border-info border-2" : "",
    isGraveyard ? "border-secondary opacity-75" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleArchive = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (onArchive && confirm(`Archive soul "${soul.name}"?`)) {
      onArchive(soul.id);
    }
  };

  const handleRestore = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    onRestore?.(soul.id);
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
          {!isGraveyard && soul.activeTraitCount >= traitLimit && traitLimit > 0 && (
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
            isArchived={isGraveyard}
          />
        </div>
        <div class="d-flex justify-content-between align-items-center">
          {!soul.isMandatory && !isGraveyard && onArchive && (
            <button type="button" class="btn btn-outline-danger btn-sm" onClick={handleArchive}>
              Archive
            </button>
          )}
          {isGraveyard && onRestore && (
            <button type="button" class="btn btn-outline-success btn-sm" onClick={handleRestore}>
              Restore
            </button>
          )}
          {soul.isMandatory && <span class="badge bg-warning text-dark">Mandatory</span>}
        </div>
      </div>
    </div>
  );
}
