interface MentorLevelUpConfirmProps {
  soulName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MentorLevelUpConfirm({ soulName, onConfirm, onCancel }: MentorLevelUpConfirmProps) {
  return (
    <div class="mt-3 p-3 border border-warning rounded bg-body-tertiary">
      <h6 class="text-warning mb-2">Level Up {soulName}</h6>
      <p class="text-body small mb-2">The Mentor will:</p>
      <ul class="text-muted small mb-2">
        <li>Consolidate related traits into stronger ones</li>
        <li>Promote the best traits into the soul's essence</li>
        <li>Carry remaining traits forward</li>
        <li>Rewrite the essence to integrate new growth</li>
      </ul>
      <p class="text-warning small mb-3">
        This cannot be undone except via emergency revert in the Level History.
      </p>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-sm btn-warning" onClick={onConfirm}>
          Level Up Now
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
