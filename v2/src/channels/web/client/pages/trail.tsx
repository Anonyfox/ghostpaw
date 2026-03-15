import { useEffect, useState } from "preact/hooks";
import type { TrailStateResponse } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";
import { ChronicleTab } from "./trail_chronicle_tab.tsx";
import { OmensTab } from "./trail_omens_tab.tsx";
import { ThreadsTab } from "./trail_threads_tab.tsx";
import { WisdomTab } from "./trail_wisdom_tab.tsx";

type Tab = "chronicle" | "wisdom" | "threads" | "omens";

export function TrailPage() {
  const [tab, setTab] = useState<Tab>("chronicle");
  const [state, setState] = useState<TrailStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<TrailStateResponse>("/api/trail/state")
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subtitle = state?.chapter
    ? `Chapter: ${state.chapter.label} · ${state.momentum} · ${state.recentTrailmarks.length} trailmarks`
    : null;

  return (
    <div>
      <h2 class="mb-1">Trail</h2>
      {loading && <p class="text-muted">Loading...</p>}
      {subtitle && <p class="text-muted small mb-3">{subtitle}</p>}
      {!loading && !subtitle && <p class="text-muted small mb-3">No trail data yet.</p>}

      <ul class="nav nav-tabs mb-3">
        {(["chronicle", "wisdom", "threads", "omens"] as Tab[]).map((t) => (
          <li class="nav-item" key={t}>
            <button
              type="button"
              class={`nav-link ${tab === t ? "active text-info" : "text-body-secondary"}`}
              onClick={() => setTab(t)}
            >
              {t === "chronicle"
                ? "Chronicle"
                : t === "wisdom"
                  ? "Wisdom"
                  : t === "threads"
                    ? "Threads"
                    : "Omens"}
            </button>
          </li>
        ))}
      </ul>

      {tab === "chronicle" && <ChronicleTab />}
      {tab === "wisdom" && <WisdomTab />}
      {tab === "threads" && <ThreadsTab />}
      {tab === "omens" && <OmensTab />}
    </div>
  );
}
