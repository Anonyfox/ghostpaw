import type {
  SkillHealthInfo,
  SkillProposalInfo,
  SkillSummaryInfo,
} from "../../shared/trainer_types.ts";
import { ProposalCard } from "./proposal_card.tsx";

interface RewardMenuProps {
  skills: SkillSummaryInfo[];
  health: SkillHealthInfo | null;
  proposals: SkillProposalInfo[];
  onApproveProposal: (id: number) => void;
  onDismissProposal: (id: number) => void;
  onTrainSkill: (name: string) => void;
}

export function RewardMenu({
  skills,
  health,
  proposals,
  onApproveProposal,
  onDismissProposal,
  onTrainSkill,
}: RewardMenuProps) {
  const readySkills = skills.filter((s) => s.readiness === "orange" || s.readiness === "yellow");

  if (readySkills.length === 0 && proposals.length === 0 && !health?.oversizedSkills?.length) {
    return null;
  }

  return (
    <div class="card border-warning mb-4">
      <div class="card-body">
        <h6 class="card-title mb-3">Training Opportunities</h6>

        {readySkills.length > 0 && (
          <div class="mb-3">
            <div class="text-muted small mb-1">Ready for training:</div>
            <div class="d-flex flex-wrap gap-2">
              {readySkills.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  class={`btn btn-sm ${s.readiness === "orange" ? "btn-warning" : "btn-outline-warning"}`}
                  onClick={() => onTrainSkill(s.name)}
                >
                  <span
                    style={`color: ${s.readiness === "orange" ? "#fd7e14" : "#ffc107"}; margin-right: 4px;`}
                  >
                    ●
                  </span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {proposals.length > 0 && (
          <div class="mb-3">
            <div class="text-muted small mb-1">Stoke proposals:</div>
            {proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onApprove={onApproveProposal}
                onDismiss={onDismissProposal}
              />
            ))}
          </div>
        )}

        {health?.oversizedSkills && health.oversizedSkills.length > 0 && (
          <div>
            <div class="text-muted small mb-1">Oversized skills (consider splitting):</div>
            <div class="d-flex flex-wrap gap-2">
              {health.oversizedSkills.map((name) => (
                <span key={name} class="badge bg-secondary">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
