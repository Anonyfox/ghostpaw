import { useEffect, useState } from "preact/hooks";
import type { WisdomEntryInfo, WisdomListResponse } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";

const WISDOM_LABELS: Record<string, string> = {
  tone: "How I Speak",
  framing: "How I Frame Things",
  timing: "When I Reach Out",
  initiative: "What I Do Unprompted",
  workflow: "How We Work Together",
  boundaries: "What I Avoid",
  other: "Other Patterns",
};

export function WisdomTab() {
  const [entries, setEntries] = useState<WisdomEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<WisdomListResponse>("/api/trail/wisdom")
      .then((res) => setEntries(res.entries))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p class="text-muted">Loading...</p>;
  if (entries.length === 0) {
    return (
      <p class="text-muted text-center mt-4">
        No pairing wisdom yet. The historian discovers patterns during trail sweeps.
      </p>
    );
  }

  const grouped = new Map<string, WisdomEntryInfo[]>();
  for (const e of entries) {
    const list = grouped.get(e.category) ?? [];
    list.push(e);
    grouped.set(e.category, list);
  }

  return (
    <div class="accordion" id="wisdomAccordion">
      {[...grouped.entries()].map(([cat, items]) => (
        <div class="accordion-item" key={cat}>
          <h2 class="accordion-header">
            <button
              class="accordion-button collapsed bg-body-tertiary"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target={`#wisdom-${cat}`}
              aria-expanded="false"
            >
              {WISDOM_LABELS[cat] ?? cat} ({items.length})
            </button>
          </h2>
          <div id={`wisdom-${cat}`} class="accordion-collapse collapse">
            <div class="accordion-body p-2">
              {items.map((w) => (
                <WisdomEntry key={w.id} entry={w} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WisdomEntry({ entry }: { entry: WisdomEntryInfo }) {
  return (
    <div class="mb-2 p-2">
      <div class="fw-medium">"{entry.pattern}"</div>
      {entry.guidance && <div class="small text-body-secondary ms-3">↳ {entry.guidance}</div>}
      <div class="small text-muted ms-3">
        confirmed {entry.evidenceCount}× · confidence {entry.confidence.toFixed(2)} · hit{" "}
        {entry.hitCount}×
      </div>
    </div>
  );
}
