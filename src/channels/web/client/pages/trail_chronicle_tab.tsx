import { useCallback, useEffect, useState } from "preact/hooks";
import type { ChronicleEntryInfo, ChronicleListResponse } from "../../shared/trail_types.ts";
import { apiGet } from "../api_get.ts";
import { RenderMarkdown } from "../components/render_markdown.tsx";

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ChronicleTab() {
  const [entries, setEntries] = useState<ChronicleEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback((beforeId?: number) => {
    const url = beforeId
      ? `/api/trail/chronicle?limit=10&beforeId=${beforeId}`
      : "/api/trail/chronicle?limit=10";
    apiGet<ChronicleListResponse>(url)
      .then((res) => {
        if (beforeId) {
          setEntries((prev) => [...prev, ...res.entries]);
        } else {
          setEntries(res.entries);
        }
        setHasMore(res.entries.length === 10);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p class="text-muted">Loading...</p>;
  if (entries.length === 0) {
    return (
      <p class="text-muted text-center mt-4">
        No chronicle entries yet. The historian writes the first entry after the trail sweep runs.
      </p>
    );
  }

  return (
    <div>
      {entries.map((e) => (
        <ChronicleCard key={e.id} entry={e} />
      ))}
      {hasMore && (
        <div class="text-center mt-3">
          <button
            type="button"
            class="btn btn-sm btn-outline-info"
            onClick={() => load(entries[entries.length - 1].id)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function ChronicleCard({ entry }: { entry: ChronicleEntryInfo }) {
  const [expanded, setExpanded] = useState(false);
  const highlights = parseJsonArray(entry.highlights);
  const surprises = parseJsonArray(entry.surprises);
  const unresolved = parseJsonArray(entry.unresolved);
  const counts = [
    highlights.length > 0
      ? `${highlights.length} highlight${highlights.length > 1 ? "s" : ""}`
      : null,
    surprises.length > 0 ? `${surprises.length} surprise${surprises.length > 1 ? "s" : ""}` : null,
    unresolved.length > 0 ? `${unresolved.length} unresolved` : null,
  ].filter(Boolean);

  return (
    <div class="trail-entry mb-3 p-3 rounded bg-body-tertiary">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <span class="text-info fw-semibold">
          {"◆ "}
          {entry.date} — {entry.title}
        </span>
      </div>
      <button
        type="button"
        class={`trail-entry-narrative ${expanded ? "expanded" : ""} btn btn-link text-start p-0 w-100 text-decoration-none text-body`}
        onClick={() => setExpanded(!expanded)}
      >
        <RenderMarkdown content={entry.narrative} />
      </button>
      {!expanded && entry.narrative.length > 200 && (
        <button
          type="button"
          class="btn btn-link btn-sm text-info p-0"
          onClick={() => setExpanded(true)}
        >
          show more
        </button>
      )}
      {counts.length > 0 && <div class="small text-muted mt-2">{counts.join(" · ")}</div>}
    </div>
  );
}
