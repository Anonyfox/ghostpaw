import { useCallback, useEffect, useState } from "preact/hooks";
import type { LoopsListResponse, OpenLoopInfo } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";
import { relativeTime } from "../relative_time.ts";

export function ThreadsTab() {
  const [loops, setLoops] = useState<OpenLoopInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("alive");

  const load = useCallback(() => {
    setLoading(true);
    apiGet<LoopsListResponse>(`/api/trail/loops?status=${status}&limit=20`)
      .then((res) => setLoops(res.loops))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p class="text-muted">Loading...</p>;

  return (
    <div>
      <div class="d-flex gap-2 mb-3">
        {["alive", "dormant", "resolved", "dismissed"].map((s) => (
          <button
            key={s}
            type="button"
            class={`btn btn-sm ${status === s ? "btn-info" : "btn-outline-secondary"}`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {loops.length === 0 ? (
        <p class="text-muted text-center mt-4">
          No open threads. The historian identifies unresolved themes during trail sweeps.
        </p>
      ) : (
        <div>
          {loops.map((l) => (
            <LoopRow key={l.id} loop={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoopRow({ loop }: { loop: OpenLoopInfo }) {
  const dot = loop.status === "alive" ? "●" : loop.status === "dormant" ? "○" : "✓";
  const sigClass = loop.significance >= 7 ? "text-info fw-bold" : "text-muted";
  const statusBadge =
    loop.status === "alive"
      ? "bg-info"
      : loop.status === "dormant"
        ? "bg-secondary"
        : loop.status === "resolved"
          ? "bg-success"
          : "bg-secondary opacity-50";

  return (
    <div class="d-flex align-items-start gap-2 mb-2 p-2 rounded bg-body-tertiary">
      <span class="text-info">{dot}</span>
      <div class="flex-grow-1">
        <div>{loop.description}</div>
        <div class="d-flex gap-2 mt-1">
          <span class={`badge ${statusBadge}`}>{loop.status}</span>
          {loop.recommendedAction && (
            <span class="badge bg-info bg-opacity-25 text-info">{loop.recommendedAction}</span>
          )}
          <span class="small text-muted">{relativeTime(loop.updatedAt)}</span>
        </div>
      </div>
      <span class={sigClass}>{loop.significance}</span>
    </div>
  );
}
