import { useEffect, useState } from "preact/hooks";
import type { OmenInfo, OmensListResponse } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";
import { relativeTime } from "../relative_time.ts";

export function OmensTab() {
  const [omens, setOmens] = useState<OmenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet<OmensListResponse>(`/api/trail/omens?includeResolved=${showResolved}`)
      .then((res) => setOmens(res.omens))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showResolved]);

  if (loading) return <p class="text-muted">Loading...</p>;

  return (
    <div>
      <div class="mb-3">
        <label class="form-check form-check-inline">
          <input
            type="checkbox"
            class="form-check-input"
            checked={showResolved}
            onChange={() => setShowResolved(!showResolved)}
          />
          <span class="form-check-label small text-muted">Include resolved</span>
        </label>
      </div>
      {omens.length === 0 ? (
        <p class="text-muted text-center mt-4">
          No omens yet. The historian makes predictions during trail sweeps.
        </p>
      ) : (
        <div>
          {omens.map((o) => (
            <OmenRow key={o.id} omen={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OmenRow({ omen }: { omen: OmenInfo }) {
  const resolved = omen.resolvedAt !== null;
  const prefix = resolved ? "✓" : "⟡";
  const confClass = !resolved && omen.confidence >= 0.7 ? "text-warning" : "text-muted";
  const outcomeClass =
    resolved && omen.predictionError !== null
      ? omen.predictionError < 0.3
        ? "text-success"
        : "text-danger"
      : "";

  return (
    <div class="mb-2 p-2 rounded bg-body-tertiary">
      <div class="d-flex justify-content-between">
        <span>
          <span class={confClass}>{prefix}</span> {omen.forecast}
        </span>
        {!resolved && <span class={confClass}>confidence {omen.confidence.toFixed(2)}</span>}
        {resolved && omen.outcome && <span class={outcomeClass}>{omen.outcome}</span>}
      </div>
      <div class="small text-muted mt-1">
        {omen.horizon &&
          `horizon: ${Math.max(0, Math.ceil((omen.horizon - Date.now()) / 86_400_000))}d · `}
        {resolved &&
          omen.predictionError !== null &&
          `error: ${omen.predictionError.toFixed(2)} · `}
        {resolved
          ? `resolved ${relativeTime(omen.resolvedAt!)}`
          : `created ${relativeTime(omen.createdAt)}`}
      </div>
      <div class="trail-omen-bar mt-1 bg-body-secondary" style="width: 100%;">
        <div
          class={`trail-omen-bar ${resolved ? (omen.predictionError !== null && omen.predictionError < 0.3 ? "bg-success" : "bg-danger") : "bg-warning"}`}
          style={`width: ${Math.round(omen.confidence * 100)}%;`}
        />
      </div>
    </div>
  );
}
