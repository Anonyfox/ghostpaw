import { useState } from "preact/hooks";
import type { CostsLimitInfo, CostsTodaySummary } from "../../shared/cost_types.ts";

interface Props {
  today: CostsTodaySummary;
  limit: CostsLimitInfo;
  onLimitChange: (value: number) => void;
}

function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function CostSpendGauge({ today, limit, onLimitChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const hasLimit = limit.maxCostPerDay > 0;
  const pct = hasLimit ? Math.min((today.costUsd / limit.maxCostPerDay) * 100, 100) : 0;
  const atWarning = hasLimit && pct >= limit.warnAtPercentage;
  const atLimit = hasLimit && today.costUsd >= limit.maxCostPerDay;

  let barClass = "bg-success";
  if (atLimit) barClass = "bg-danger";
  else if (atWarning) barClass = "bg-warning";

  let statusText: string;
  if (!hasLimit) {
    statusText = `${formatUsd(today.costUsd)} today — no limit`;
  } else if (atLimit) {
    statusText = `${formatUsd(today.costUsd)} of ${formatUsd(limit.maxCostPerDay)} — limit reached`;
  } else if (atWarning) {
    statusText = `${formatUsd(today.costUsd)} of ${formatUsd(limit.maxCostPerDay)} (${Math.round(pct)}%) — approaching limit`;
  } else {
    statusText = `${formatUsd(today.costUsd)} of ${formatUsd(limit.maxCostPerDay)} (${Math.round(pct)}%)`;
  }

  const handleSave = () => {
    const val = Number.parseFloat(draft);
    if (!Number.isNaN(val) && val >= 0) {
      onLimitChange(val);
    }
    setEditing(false);
  };

  return (
    <div class="mb-4">
      <div class="d-flex align-items-baseline gap-3 mb-2">
        <span class="fs-2 fw-bold">{formatUsd(today.costUsd)}</span>
        <span class="text-body-secondary">today</span>
      </div>

      {hasLimit && (
        <div class="progress mb-2" style="height: 6px;">
          <div
            class={`progress-bar ${barClass}`}
            role="progressbar"
            style={`width: ${pct}%`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      <div class="d-flex align-items-center gap-2 text-body-secondary small">
        <span class={atLimit ? "text-danger fw-semibold" : ""}>{statusText}</span>
        <span class="ms-auto" />

        {editing ? (
          <span class="d-inline-flex align-items-center gap-1">
            <span>$</span>
            <input
              type="number"
              class="form-control form-control-sm"
              style="width: 80px;"
              value={draft}
              step="0.5"
              min="0"
              onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button type="button" class="btn btn-sm btn-outline-info" onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setDraft(String(limit.maxCostPerDay));
              setEditing(true);
            }}
          >
            {hasLimit ? "Edit limit" : "Set limit"}
          </button>
        )}
      </div>
    </div>
  );
}
