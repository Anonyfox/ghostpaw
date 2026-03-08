import { useEffect, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { PackPatrolResponse } from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";

const TIER_COLORS: Record<string, string> = {
  deep: "text-danger",
  solid: "text-warning",
  growing: "text-secondary",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PackPatrolPanel() {
  const [data, setData] = useState<PackPatrolResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PackPatrolResponse>("/api/pack/patrol")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data) return null;

  const hasDrift = data.drift.length > 0;
  const hasLandmarks = data.landmarks.length > 0;
  if (!hasDrift && !hasLandmarks) return null;

  return (
    <div class="card mb-4 border-info border-opacity-25">
      <div class="card-body py-3">
        <h6 class="card-title text-info mb-3" style="font-size: 0.85rem;">
          Patrol
        </h6>

        {hasDrift && (
          <div class="mb-3">
            <div class="text-body-secondary small mb-1">Drifting bonds</div>
            {data.drift.map((d) => (
              <div
                key={d.memberId}
                class="d-flex justify-content-between align-items-center small mb-1"
              >
                <div>
                  <span class={`me-1 ${TIER_COLORS[d.tier] ?? ""}`}>●</span>
                  <Link href={`/pack/${d.memberId}`} class="text-info text-decoration-none">
                    {d.name}
                  </Link>
                  <span class="text-body-tertiary ms-2">{d.tier}</span>
                </div>
                <span class="text-body-tertiary">{d.daysSilent}d silent</span>
              </div>
            ))}
          </div>
        )}

        {hasLandmarks && (
          <div>
            <div class="text-body-secondary small mb-1">Upcoming</div>
            {data.landmarks.map((l) => (
              <div
                key={`${l.memberId}-${l.type}-${l.date}`}
                class="d-flex justify-content-between align-items-center small mb-1"
              >
                <div>
                  <Link href={`/pack/${l.memberId}`} class="text-info text-decoration-none">
                    {l.name}
                  </Link>
                  <span class="text-body-tertiary ms-2">
                    {l.type === "birthday"
                      ? `birthday${l.yearsAgo ? ` (turns ${l.yearsAgo})` : ""}`
                      : `${l.yearsAgo}yr anniversary`}
                  </span>
                </div>
                <span class="text-body-tertiary">
                  {fmtDate(l.date)} ({l.daysAway}d)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
