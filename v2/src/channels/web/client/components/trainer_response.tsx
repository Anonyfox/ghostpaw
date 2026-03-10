interface TrainerResponseProps {
  content: string;
  succeeded: boolean;
  cost: { totalUsd: number };
  skillName?: string;
  newRank?: number;
  newTier?: string;
  onClose: () => void;
}

export function TrainerResponse({
  content,
  succeeded,
  cost,
  skillName,
  newRank,
  newTier,
  onClose,
}: TrainerResponseProps) {
  const costStr = `$${cost.totalUsd.toFixed(2)}`;

  return (
    <div class="mt-3 p-3 border border-secondary rounded bg-body-tertiary">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="d-flex align-items-center gap-2">
          <span class={`badge ${succeeded ? "bg-success" : "bg-danger"}`}>
            {succeeded ? "Success" : "Failed"}
          </span>
          <span class="text-muted small">{costStr}</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onClose}>
          Close
        </button>
      </div>
      {succeeded && newRank != null && newTier && (
        <div class="alert alert-info py-1 px-2 small mb-2">
          <strong>▲</strong> {skillName ?? "Skill"} reached <strong>{newTier}</strong> (rank{" "}
          {newRank})
        </div>
      )}
      <div class="text-body small" style="white-space: pre-wrap;">
        {content}
      </div>
    </div>
  );
}
