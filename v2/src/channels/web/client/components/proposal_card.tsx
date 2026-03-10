import type { SkillProposalInfo } from "../../shared/trainer_types.ts";

interface ProposalCardProps {
  proposal: SkillProposalInfo;
  onApprove: (id: number) => void;
  onDismiss: (id: number) => void;
}

export function ProposalCard({ proposal, onApprove, onDismiss }: ProposalCardProps) {
  return (
    <div class="card bg-body-tertiary border-info mb-2">
      <div class="card-body py-2 px-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">{proposal.title}</h6>
            <p class="text-muted small mb-0">{proposal.rationale}</p>
          </div>
          <div class="d-flex gap-1 flex-shrink-0 ms-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-info"
              onClick={() => onApprove(proposal.id)}
            >
              Approve
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => onDismiss(proposal.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
