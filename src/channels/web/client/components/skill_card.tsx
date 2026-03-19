import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { SkillRankBadge } from "./skill_rank_badge.tsx";

interface SkillCardProps {
  skill: SkillSummaryInfo;
  onClick: () => void;
}

const READINESS_COLOR: Record<string, string> = {
  grey: "#6c757d",
  green: "#198754",
  yellow: "#ffc107",
  orange: "#fd7e14",
};

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const borderClass = skill.hasPendingChanges
    ? "border-warning"
    : skill.rank >= 5
      ? "border-info"
      : "border-secondary";

  const dotColor = READINESS_COLOR[skill.readiness] ?? READINESS_COLOR.grey;

  return (
    <button
      type="button"
      class={`card bg-body-tertiary ${borderClass} h-100 border text-start w-100 p-0`}
      onClick={onClick}
      style="cursor: pointer;"
    >
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <div class="d-flex align-items-center gap-2">
            <span style={`color: ${dotColor}; font-size: 0.6rem;`}>●</span>
            <h6 class="card-title mb-0">{skill.name}</h6>
          </div>
          <SkillRankBadge rank={skill.rank} tier={skill.tier} />
        </div>
        <p
          class="card-text text-muted small flex-grow-1 mb-2"
          style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
        >
          {skill.description}
        </p>
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted" style="font-size: 0.75rem;">
            {skill.tier} · {skill.fileCount} file{skill.fileCount !== 1 ? "s" : ""}
          </span>
          {skill.hasPendingChanges && (
            <span class="badge bg-warning text-dark" style="font-size: 0.65rem;">
              Modified
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
