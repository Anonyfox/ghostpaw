import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { SkillRankBadge } from "./skill_rank_badge.tsx";

interface SkillCardProps {
  skill: SkillSummaryInfo;
  onClick: () => void;
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const borderClass = skill.hasPendingChanges
    ? "border-warning"
    : skill.rank >= 5
      ? "border-info"
      : "border-secondary";

  return (
    <div
      class={`card bg-body-tertiary ${borderClass} h-100`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style="cursor: pointer;"
    >
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h6 class="card-title mb-0">{skill.name}</h6>
          <SkillRankBadge rank={skill.rank} />
        </div>
        <p
          class="card-text text-muted small flex-grow-1 mb-2"
          style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
        >
          {skill.description}
        </p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted" style="font-size: 0.75rem;">
            {skill.fileCount} file{skill.fileCount !== 1 ? "s" : ""}
          </span>
          {skill.hasPendingChanges && (
            <span class="badge bg-warning text-dark" style="font-size: 0.65rem;">
              Modified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
