import type { LevelInfo } from "../../shared/soul_types.ts";

interface MentorLevelUpResultProps {
  content: string;
  succeeded: boolean;
  cost: { totalUsd: number };
  level: LevelInfo;
  newLevel: number;
  onClose: () => void;
}

export function MentorLevelUpResult({
  content,
  succeeded,
  cost,
  level,
  newLevel,
  onClose,
}: MentorLevelUpResultProps) {
  const costStr = `$${cost.totalUsd.toFixed(2)}`;

  return (
    <div class="mt-3 p-3 border border-warning rounded bg-body-tertiary">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="text-warning mb-0">Level Up Complete — Level {newLevel}</h6>
        <div class="d-flex align-items-center gap-2">
          <span class={`badge ${succeeded ? "bg-success" : "bg-danger"}`}>
            {succeeded ? "Success" : "Failed"}
          </span>
          <span class="text-muted small">{costStr}</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <div class="text-muted small fw-semibold mb-1">Essence Before</div>
          <div
            class="p-2 border border-secondary rounded small text-muted"
            style="max-height: 200px; overflow-y: auto; white-space: pre-wrap;"
          >
            {level.essenceBefore}
          </div>
        </div>
        <div class="col-md-6">
          <div class="text-body small fw-semibold mb-1">Essence After</div>
          <div
            class="p-2 border border-info rounded small text-body"
            style="max-height: 200px; overflow-y: auto; white-space: pre-wrap;"
          >
            {level.essenceAfter}
          </div>
        </div>
      </div>

      <div class="d-flex gap-3 mb-3 text-muted small">
        <span>Consolidated: {level.traitsConsolidated.length}</span>
        <span>Promoted: {level.traitsPromoted.length}</span>
        <span>Carried: {level.traitsCarried.length}</span>
      </div>

      <div class="text-body small" style="white-space: pre-wrap;">
        {content}
      </div>
    </div>
  );
}
