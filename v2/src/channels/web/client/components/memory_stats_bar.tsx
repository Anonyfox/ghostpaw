import type { MemoryStatsResponse } from "../../shared/memory_types.ts";

interface MemoryStatsBarProps {
  stats: MemoryStatsResponse | null;
  onShowStale?: () => void;
}

export function MemoryStatsBar({ stats, onShowStale }: MemoryStatsBarProps) {
  if (!stats) {
    return <div class="text-body-tertiary small mb-3">Loading stats...</div>;
  }

  const superseded = stats.total - stats.active;

  return (
    <div class="d-flex flex-wrap gap-4 align-items-center mb-3 small">
      <span class="text-body-secondary">
        <strong class="text-body">{stats.active}</strong> active
        {superseded > 0 && <span class="text-body-tertiary"> / {stats.total} total</span>}
      </span>

      <span class="d-flex align-items-center gap-2">
        <span class="text-success" title="Strong (confidence >= 0.7)">
          &#9679; {stats.strong}
        </span>
        <span class="text-warning" title="Fading (confidence 0.4–0.7)">
          &#9679; {stats.fading}
        </span>
        <span class="text-body-tertiary" title="Faint (confidence < 0.4)">
          &#9679; {stats.faint}
        </span>
      </span>

      {stats.stale > 0 && (
        <button
          type="button"
          class="btn btn-outline-warning btn-sm py-0 px-2"
          onClick={onShowStale}
          title="Memories that may need review — high evidence but long since verified"
        >
          {stats.stale} needs review
        </button>
      )}
    </div>
  );
}
