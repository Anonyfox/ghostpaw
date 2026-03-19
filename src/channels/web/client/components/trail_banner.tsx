import { useEffect, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { TrailStateResponse } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";

export function TrailBanner() {
  const [state, setState] = useState<TrailStateResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet<TrailStateResponse>("/api/trail/state")
      .then((data) => {
        setState(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!state?.chapter && (!state?.topLoops || state.topLoops.length === 0)) return null;

  const loopText = state.topLoops
    .slice(0, 2)
    .map((l) => l.description)
    .join(" · ");

  return (
    <Link
      href="/trail"
      class={`trail-banner ${loaded ? "loaded" : ""} d-block border-bottom px-3 py-1 text-decoration-none`}
    >
      {state.chapter && (
        <div class="small text-info">
          {"◆ "}
          {state.chapter.label} · {state.momentum}
        </div>
      )}
      {loopText && <div class="small text-muted">↳ {loopText}</div>}
    </Link>
  );
}
